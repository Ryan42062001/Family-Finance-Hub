import type {
  RetirementAccountOpportunity,
  RetirementAccountOpportunityResult,
} from "./money-priority-retirement-accounts.ts";

export type RetirementCapacityConsumer = "one_time" | "secure" | "build" | "windfall";

export type RetirementCapacityLedgerEntry = {
  accountId: string;
  accountType: string;
  ownerPersonId: string | null;
  sharedCapacityGroup: string | null;
  ownerCapacityGroup: string | null;
  verified: boolean;
  informationNeeded: string[];
  originalRemainingAnnualRoom: number | null;
  remainingAnnualRoom: number | null;
  employeeElectiveDeferralRemainingRoom: number | null;
  annualAdditionsRemainingRoom: number | null;
  compensationBasedRemainingRoom: number | null;
  sharedOrdinaryRemainingRoom: number | null;
  catchUpRemainingRoom: number | null;
  accountSpecificRemainingRoom: number | null;
  consumed: Record<RetirementCapacityConsumer, number>;
};

export type RetirementCapacityLedgerGroup = {
  id: string;
  ownerPersonIds: string[];
  originalRemainingAnnualRoom: number;
  remainingAnnualRoom: number;
  consumed: Record<RetirementCapacityConsumer, number>;
};

export type RetirementCapacityLedger = {
  taxYear: number;
  taxPolicyVersion: string;
  entries: RetirementCapacityLedgerEntry[];
  groups: RetirementCapacityLedgerGroup[];
};

export type RetirementCapacityConsumption = {
  accountId: string;
  sharedCapacityGroup: string | null;
  consumer: RetirementCapacityConsumer;
  requestedAnnualAmount: number;
  consumedAnnualAmount: number;
  remainingAnnualRoom: number;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function zeroConsumption(): Record<RetirementCapacityConsumer, number> {
  return { one_time: 0, secure: 0, build: 0, windfall: 0 };
}

function annualAdditionsRoom(opportunity: RetirementAccountOpportunity): number | null {
  if (opportunity.annualAdditionsLimit === null || opportunity.annualAdditionsLimit === undefined) return null;
  if (opportunity.annualAdditionsYtd === null || opportunity.annualAdditionsYtd === undefined) return null;
  return roundMoney(Math.max(0, opportunity.annualAdditionsLimit - opportunity.annualAdditionsYtd));
}

function compensationRoom(opportunity: RetirementAccountOpportunity): number | null {
  if (opportunity.compensationLimitApplied === null || opportunity.compensationLimitApplied === undefined) return null;
  if (opportunity.contributedYtd === null) return null;
  return roundMoney(Math.max(0, opportunity.compensationLimitApplied - opportunity.contributedYtd));
}

function catchUpRoom(opportunity: RetirementAccountOpportunity): number | null {
  if (opportunity.ownerCatchUpRemainingRoom !== undefined) {
    return opportunity.ownerCatchUpRemainingRoom;
  }
  if (!opportunity.catchUpEligible) return 0;
  if (opportunity.catchUpAmount === null || opportunity.catchUpAmount === undefined) return null;
  if (opportunity.contributedYtd === null) return null;
  const baseLimit = opportunity.annualLimit === null
    ? null
    : Math.max(0, opportunity.annualLimit - opportunity.catchUpAmount);
  if (baseLimit === null) return null;
  const catchUpUsed = Math.max(0, opportunity.contributedYtd - baseLimit);
  return roundMoney(Math.max(0, opportunity.catchUpAmount - catchUpUsed));
}

function groupOriginalRoom(
  groupId: string,
  entries: RetirementCapacityLedgerEntry[],
): number {
  const groupEntries = entries.filter((entry) => entry.sharedCapacityGroup === groupId && entry.verified);
  if (groupId === "hsa:married-family") {
    return roundMoney(groupEntries.reduce(
      (largest, entry) => Math.max(largest, entry.sharedOrdinaryRemainingRoom ?? 0),
      0,
    ));
  }
  return roundMoney(groupEntries.reduce(
    (largest, entry) => Math.max(largest, entry.originalRemainingAnnualRoom ?? 0),
    0,
  ));
}

export function createRetirementCapacityLedger(
  result: RetirementAccountOpportunityResult,
): RetirementCapacityLedger {
  const entries = result.opportunities
    .map((opportunity): RetirementCapacityLedgerEntry => {
      const verified = opportunity.state === "available" || opportunity.state === "limit_reached";
      const originalRemainingAnnualRoom = verified
        ? roundMoney(Math.max(0, opportunity.remainingAnnualRoom ?? 0))
        : null;
      const workplaceEmployeeType = ["401k", "403b", "457", "457b", "tsp", "simple_ira"]
        .includes(opportunity.accountType);
      return {
        accountId: opportunity.accountId,
        accountType: opportunity.accountType,
        ownerPersonId: opportunity.ownerPersonId,
        sharedCapacityGroup: opportunity.sharedCapacityGroup ?? null,
        ownerCapacityGroup: opportunity.sharedCapacityGroup === "hsa:married-family" && opportunity.ownerPersonId
          ? `hsa-owner:${opportunity.ownerPersonId}`
          : null,
        verified,
        informationNeeded: verified ? [] : [...opportunity.missingData],
        originalRemainingAnnualRoom,
        remainingAnnualRoom: originalRemainingAnnualRoom,
        employeeElectiveDeferralRemainingRoom: workplaceEmployeeType
          ? originalRemainingAnnualRoom
          : null,
        annualAdditionsRemainingRoom: annualAdditionsRoom(opportunity),
        compensationBasedRemainingRoom: compensationRoom(opportunity),
        sharedOrdinaryRemainingRoom: opportunity.sharedOrdinaryRemainingRoom ?? null,
        catchUpRemainingRoom: catchUpRoom(opportunity),
        accountSpecificRemainingRoom: originalRemainingAnnualRoom,
        consumed: zeroConsumption(),
      };
    })
    .sort((a, b) => a.accountId.localeCompare(b.accountId));

  const groupIds = [...new Set(entries
    .flatMap((entry) => [entry.sharedCapacityGroup, entry.ownerCapacityGroup])
    .filter((groupId): groupId is string => Boolean(groupId)))].sort();
  const groups = groupIds.map((id): RetirementCapacityLedgerGroup => {
    const originalRemainingAnnualRoom = id.startsWith("hsa-owner:")
      ? roundMoney(entries
          .filter((entry) => entry.ownerCapacityGroup === id && entry.verified)
          .reduce((largest, entry) => Math.max(largest, entry.catchUpRemainingRoom ?? 0), 0))
      : groupOriginalRoom(id, entries);
    return {
      id,
      ownerPersonIds: [...new Set(entries
        .filter((entry) => entry.sharedCapacityGroup === id || entry.ownerCapacityGroup === id)
        .map((entry) => entry.ownerPersonId)
        .filter((ownerId): ownerId is string => Boolean(ownerId)))].sort(),
      originalRemainingAnnualRoom,
      remainingAnnualRoom: originalRemainingAnnualRoom,
      consumed: zeroConsumption(),
    };
  });

  return {
    taxYear: result.taxYear,
    taxPolicyVersion: result.taxPolicyVersion,
    entries,
    groups,
  };
}

export function cloneRetirementCapacityLedger(
  ledger: RetirementCapacityLedger,
): RetirementCapacityLedger {
  return {
    taxYear: ledger.taxYear,
    taxPolicyVersion: ledger.taxPolicyVersion,
    entries: ledger.entries.map((entry) => ({
      ...entry,
      informationNeeded: [...entry.informationNeeded],
      consumed: { ...entry.consumed },
    })),
    groups: ledger.groups.map((group) => ({
      ...group,
      ownerPersonIds: [...group.ownerPersonIds],
      consumed: { ...group.consumed },
    })),
  };
}

export function remainingRetirementCapacity(
  ledger: RetirementCapacityLedger,
  accountId: string,
): number | null {
  const entry = ledger.entries.find((item) => item.accountId === accountId);
  if (!entry?.verified || entry.remainingAnnualRoom === null) return null;
  const group = entry.sharedCapacityGroup
    ? ledger.groups.find((item) => item.id === entry.sharedCapacityGroup)
    : null;
  const ownerGroup = entry.ownerCapacityGroup
    ? ledger.groups.find((item) => item.id === entry.ownerCapacityGroup)
    : null;
  if (entry.sharedCapacityGroup === "hsa:married-family") {
    const componentRoom = roundMoney(
      (group?.remainingAnnualRoom ?? 0) + (ownerGroup?.remainingAnnualRoom ?? 0),
    );
    return roundMoney(Math.max(0, Math.min(entry.remainingAnnualRoom, componentRoom)));
  }
  return roundMoney(Math.max(0, Math.min(entry.remainingAnnualRoom,
    group?.remainingAnnualRoom ?? entry.remainingAnnualRoom,
    ownerGroup?.remainingAnnualRoom ?? entry.remainingAnnualRoom)));
}

function reduceKnownRoom(value: number | null, consumed: number): number | null {
  return value === null ? null : roundMoney(Math.max(0, value - consumed));
}

export function consumeRetirementCapacity(
  ledger: RetirementCapacityLedger,
  accountId: string,
  consumer: RetirementCapacityConsumer,
  requestedAnnualAmount: number,
): RetirementCapacityConsumption {
  const entry = ledger.entries.find((item) => item.accountId === accountId);
  const available = remainingRetirementCapacity(ledger, accountId) ?? 0;
  const requested = roundMoney(Math.max(0, requestedAnnualAmount));
  const consumed = roundMoney(Math.min(requested, available));
  if (!entry || consumed <= 0) {
    return {
      accountId,
      sharedCapacityGroup: entry?.sharedCapacityGroup ?? null,
      consumer,
      requestedAnnualAmount: requested,
      consumedAnnualAmount: 0,
      remainingAnnualRoom: available,
    };
  }

  const marriedFamilyHsa = entry.sharedCapacityGroup === "hsa:married-family";
  const sharedGroup = marriedFamilyHsa
    ? ledger.groups.find((item) => item.id === entry.sharedCapacityGroup)
    : null;
  const ownerCatchUpGroup = marriedFamilyHsa && entry.ownerCapacityGroup
    ? ledger.groups.find((item) => item.id === entry.ownerCapacityGroup)
    : null;
  const ordinaryAvailable = marriedFamilyHsa
    ? Math.min(sharedGroup?.remainingAnnualRoom ?? 0, available)
    : Math.max(0, available - Math.min(entry.catchUpRemainingRoom ?? 0, available));
  const ordinaryConsumed = Math.min(consumed, ordinaryAvailable);
  const catchUpConsumed = roundMoney(Math.max(0, consumed - ordinaryConsumed));
  entry.remainingAnnualRoom = reduceKnownRoom(entry.remainingAnnualRoom, consumed);
  entry.employeeElectiveDeferralRemainingRoom = reduceKnownRoom(
    entry.employeeElectiveDeferralRemainingRoom,
    consumed,
  );
  // Supported age-based catch-up is outside the ordinary annual-additions ceiling.
  entry.annualAdditionsRemainingRoom = reduceKnownRoom(
    entry.annualAdditionsRemainingRoom,
    ordinaryConsumed,
  );
  entry.compensationBasedRemainingRoom = reduceKnownRoom(entry.compensationBasedRemainingRoom, consumed);
  entry.sharedOrdinaryRemainingRoom = reduceKnownRoom(
    entry.sharedOrdinaryRemainingRoom,
    ordinaryConsumed,
  );
  entry.catchUpRemainingRoom = reduceKnownRoom(entry.catchUpRemainingRoom, catchUpConsumed);
  entry.accountSpecificRemainingRoom = reduceKnownRoom(entry.accountSpecificRemainingRoom, consumed);
  entry.consumed[consumer] = roundMoney(entry.consumed[consumer] + consumed);

  if (marriedFamilyHsa) {
    if (sharedGroup && ordinaryConsumed > 0) {
      sharedGroup.remainingAnnualRoom = roundMoney(Math.max(
        0,
        sharedGroup.remainingAnnualRoom - ordinaryConsumed,
      ));
      sharedGroup.consumed[consumer] = roundMoney(
        sharedGroup.consumed[consumer] + ordinaryConsumed,
      );
    }
    if (ownerCatchUpGroup && catchUpConsumed > 0) {
      ownerCatchUpGroup.remainingAnnualRoom = roundMoney(Math.max(
        0,
        ownerCatchUpGroup.remainingAnnualRoom - catchUpConsumed,
      ));
      ownerCatchUpGroup.consumed[consumer] = roundMoney(
        ownerCatchUpGroup.consumed[consumer] + catchUpConsumed,
      );
    }
  } else {
    for (const groupId of [entry.sharedCapacityGroup, entry.ownerCapacityGroup]) {
      if (!groupId) continue;
      const group = ledger.groups.find((item) => item.id === groupId);
      if (group) {
        group.remainingAnnualRoom = roundMoney(Math.max(0, group.remainingAnnualRoom - consumed));
        group.consumed[consumer] = roundMoney(group.consumed[consumer] + consumed);
      }
    }
  }

  return {
    accountId,
    sharedCapacityGroup: entry.sharedCapacityGroup,
    consumer,
    requestedAnnualAmount: requested,
    consumedAnnualAmount: consumed,
    remainingAnnualRoom: remainingRetirementCapacity(ledger, accountId) ?? 0,
  };
}

export function retirementCapacityInvariantHolds(ledger: RetirementCapacityLedger): boolean {
  const entryInvariant = ledger.entries.every((entry) => {
    if (!entry.verified || entry.originalRemainingAnnualRoom === null) {
      return Object.values(entry.consumed).every((amount) => amount === 0);
    }
    const consumed = roundMoney(Object.values(entry.consumed).reduce((sum, amount) => sum + amount, 0));
    return consumed <= entry.originalRemainingAnnualRoom;
  });
  const groupInvariant = ledger.groups.every((group) => {
    const consumed = roundMoney(Object.values(group.consumed).reduce((sum, amount) => sum + amount, 0));
    return consumed <= group.originalRemainingAnnualRoom;
  });
  return entryInvariant && groupInvariant;
}
