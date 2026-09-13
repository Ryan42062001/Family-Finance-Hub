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
  sharedCapacityRemainingRoom: number | null;
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

export type RetirementCapacityTieAllocation = RetirementCapacityConsumption;

export type RetirementRecurringTieAllocation = RetirementCapacityConsumption & {
  allocatedMonthlyAmount: number;
};

export type RetirementRecurringTieResult = {
  allocations: RetirementRecurringTieAllocation[];
  consumedMonthlyAmount: number;
  consumedAnnualAmount: number;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function annualCents(value: number): number {
  return Math.round(roundMoney(Math.max(0, value)) * 100);
}

function recurringMonthlyCentsFromAnnual(value: number): number {
  return Math.floor(annualCents(value) / 12);
}

function recurringAnnualFromMonthlyCents(monthlyCents: number): number {
  return roundMoney((Math.max(0, monthlyCents) * 12) / 100);
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
  if (opportunity.ownerCatchUpRemainingRoom !== undefined) return opportunity.ownerCatchUpRemainingRoom;
  if (!opportunity.catchUpEligible) return 0;
  if (opportunity.catchUpAmount === null || opportunity.catchUpAmount === undefined) return null;
  if (opportunity.contributedYtd === null) return null;
  const baseLimit = opportunity.annualLimit === null ? null : Math.max(0, opportunity.annualLimit - opportunity.catchUpAmount);
  if (baseLimit === null) return null;
  const catchUpUsed = Math.max(0, opportunity.contributedYtd - baseLimit);
  return roundMoney(Math.max(0, opportunity.catchUpAmount - catchUpUsed));
}

function groupOriginalRoom(groupId: string, entries: RetirementCapacityLedgerEntry[]): number {
  const groupEntries = entries.filter((entry) => entry.sharedCapacityGroup === groupId && entry.verified);
  if (groupId === "hsa:married-family") {
    return roundMoney(groupEntries.reduce(
      (largest, entry) => Math.max(largest, entry.sharedCapacityRemainingRoom ?? 0),
      0,
    ));
  }
  if (groupId.startsWith("ira:mfj-compensation:")) {
    return roundMoney(groupEntries.reduce(
      (largest, entry) => Math.max(largest, entry.sharedCapacityRemainingRoom ?? 0),
      0,
    ));
  }
  return roundMoney(groupEntries.reduce(
    (largest, entry) => Math.max(largest, entry.originalRemainingAnnualRoom ?? 0),
    0,
  ));
}

export function createRetirementCapacityLedger(result: RetirementAccountOpportunityResult): RetirementCapacityLedger {
  const entries = result.opportunities
    .map((opportunity): RetirementCapacityLedgerEntry => {
      const verified = opportunity.state === "available" || opportunity.state === "limit_reached";
      const originalRemainingAnnualRoom = verified ? roundMoney(Math.max(0, opportunity.remainingAnnualRoom ?? 0)) : null;
      const workplaceEmployeeType = ["401k", "403b", "457", "457b", "tsp", "simple_ira"].includes(opportunity.accountType);
      return {
        accountId: opportunity.accountId,
        accountType: opportunity.accountType,
        ownerPersonId: opportunity.ownerPersonId,
        sharedCapacityGroup: opportunity.sharedCapacityGroup ?? null,
        ownerCapacityGroup: opportunity.ownerCapacityGroup
          ?? (opportunity.sharedCapacityGroup === "hsa:married-family" && opportunity.ownerPersonId
            ? `hsa-owner:${opportunity.ownerPersonId}`
            : null),
        verified,
        informationNeeded: verified ? [] : [...opportunity.missingData],
        originalRemainingAnnualRoom,
        remainingAnnualRoom: originalRemainingAnnualRoom,
        employeeElectiveDeferralRemainingRoom: workplaceEmployeeType ? originalRemainingAnnualRoom : null,
        annualAdditionsRemainingRoom: annualAdditionsRoom(opportunity),
        compensationBasedRemainingRoom: compensationRoom(opportunity),
        sharedCapacityRemainingRoom: opportunity.sharedCapacityRemainingRoom ?? null,
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
    const originalRemainingAnnualRoom = id.startsWith("hsa-owner:") || id.startsWith("ira-owner:")
      ? roundMoney(entries
          .filter((entry) => entry.ownerCapacityGroup === id && entry.verified)
          .reduce((largest, entry) => Math.max(largest, entry.originalRemainingAnnualRoom ?? 0), 0))
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

  return { taxYear: result.taxYear, taxPolicyVersion: result.taxPolicyVersion, entries, groups };
}

export function cloneRetirementCapacityLedger(ledger: RetirementCapacityLedger): RetirementCapacityLedger {
  return {
    taxYear: ledger.taxYear,
    taxPolicyVersion: ledger.taxPolicyVersion,
    entries: ledger.entries.map((entry) => ({ ...entry, informationNeeded: [...entry.informationNeeded], consumed: { ...entry.consumed } })),
    groups: ledger.groups.map((group) => ({ ...group, ownerPersonIds: [...group.ownerPersonIds], consumed: { ...group.consumed } })),
  };
}

export function remainingRetirementCapacity(ledger: RetirementCapacityLedger, accountId: string): number | null {
  const entry = ledger.entries.find((item) => item.accountId === accountId);
  if (!entry?.verified || entry.remainingAnnualRoom === null) return null;
  const group = entry.sharedCapacityGroup ? ledger.groups.find((item) => item.id === entry.sharedCapacityGroup) : null;
  const ownerGroup = entry.ownerCapacityGroup ? ledger.groups.find((item) => item.id === entry.ownerCapacityGroup) : null;
  if (entry.sharedCapacityGroup === "hsa:married-family") {
    return roundMoney(Math.max(0, Math.min(
      entry.remainingAnnualRoom,
      group?.remainingAnnualRoom ?? entry.remainingAnnualRoom,
      ownerGroup?.remainingAnnualRoom ?? entry.remainingAnnualRoom,
    )));
  }
  return roundMoney(Math.max(0, Math.min(
    entry.remainingAnnualRoom,
    group?.remainingAnnualRoom ?? entry.remainingAnnualRoom,
    ownerGroup?.remainingAnnualRoom ?? entry.remainingAnnualRoom,
  )));
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
    return { accountId, sharedCapacityGroup: entry?.sharedCapacityGroup ?? null, consumer, requestedAnnualAmount: requested, consumedAnnualAmount: 0, remainingAnnualRoom: available };
  }

  if (entry.sharedCapacityGroup === "hsa:married-family") {
    entry.remainingAnnualRoom = reduceKnownRoom(entry.remainingAnnualRoom, consumed);
    entry.accountSpecificRemainingRoom = reduceKnownRoom(entry.accountSpecificRemainingRoom, consumed);
    entry.consumed[consumer] = roundMoney(entry.consumed[consumer] + consumed);
    const sharedGroup = ledger.groups.find((item) => item.id === entry.sharedCapacityGroup);
    const ownerGroup = entry.ownerCapacityGroup ? ledger.groups.find((item) => item.id === entry.ownerCapacityGroup) : null;
    for (const group of [sharedGroup, ownerGroup]) {
      if (!group) continue;
      group.remainingAnnualRoom = roundMoney(Math.max(0, group.remainingAnnualRoom - consumed));
      group.consumed[consumer] = roundMoney(group.consumed[consumer] + consumed);
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

  const group = entry.sharedCapacityGroup ? ledger.groups.find((item) => item.id === entry.sharedCapacityGroup) : null;
  const ownerGroup = entry.ownerCapacityGroup ? ledger.groups.find((item) => item.id === entry.ownerCapacityGroup) : null;
  const ordinaryAvailable = Math.max(0, available - Math.min(entry.catchUpRemainingRoom ?? 0, available));
  const ordinaryConsumed = Math.min(consumed, ordinaryAvailable);
  const catchUpConsumed = roundMoney(Math.max(0, consumed - ordinaryConsumed));
  entry.remainingAnnualRoom = reduceKnownRoom(entry.remainingAnnualRoom, consumed);
  entry.employeeElectiveDeferralRemainingRoom = reduceKnownRoom(entry.employeeElectiveDeferralRemainingRoom, consumed);
  entry.annualAdditionsRemainingRoom = reduceKnownRoom(entry.annualAdditionsRemainingRoom, ordinaryConsumed);
  entry.compensationBasedRemainingRoom = reduceKnownRoom(entry.compensationBasedRemainingRoom, consumed);
  entry.sharedCapacityRemainingRoom = reduceKnownRoom(entry.sharedCapacityRemainingRoom, consumed);
  entry.sharedOrdinaryRemainingRoom = reduceKnownRoom(entry.sharedOrdinaryRemainingRoom, ordinaryConsumed);
  entry.catchUpRemainingRoom = reduceKnownRoom(entry.catchUpRemainingRoom, catchUpConsumed);
  entry.accountSpecificRemainingRoom = reduceKnownRoom(entry.accountSpecificRemainingRoom, consumed);
  entry.consumed[consumer] = roundMoney(entry.consumed[consumer] + consumed);

  for (const capacityGroup of [group, ownerGroup]) {
    if (!capacityGroup) continue;
    capacityGroup.remainingAnnualRoom = roundMoney(Math.max(0, capacityGroup.remainingAnnualRoom - consumed));
    capacityGroup.consumed[consumer] = roundMoney(capacityGroup.consumed[consumer] + consumed);
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

export function consumeRetirementCapacityForEqualOwnerTie(
  ledger: RetirementCapacityLedger,
  accountIds: string[],
  consumer: RetirementCapacityConsumer,
  requestedAnnualAmount: number,
): RetirementCapacityTieAllocation[] {
  const ownerDestinations = [...accountIds]
    .sort()
    .map((accountId) => ({ accountId, entry: ledger.entries.find((item) => item.accountId === accountId) }))
    .filter((item) => item.entry?.ownerPersonId)
    .filter((item, index, all) => all.findIndex((candidate) => candidate.entry!.ownerPersonId === item.entry!.ownerPersonId) === index)
    .map((item) => ({ ...item, available: remainingRetirementCapacity(ledger, item.accountId) ?? 0 }))
    .filter((item) => item.available > 0);
  const requestedCents = Math.round(Math.max(0, requestedAnnualAmount) * 100);
  const totalAvailableCents = ownerDestinations.reduce((sum, item) => sum + Math.round(item.available * 100), 0);
  const amountCents = Math.min(requestedCents, totalAvailableCents);
  if (amountCents <= 0 || totalAvailableCents <= 0) return [];
  const shares = ownerDestinations.map((item) => ({
    ...item,
    availableCents: Math.round(item.available * 100),
    allocatedCents: Math.floor(amountCents * Math.round(item.available * 100) / totalAvailableCents),
  }));
  let remainder = amountCents - shares.reduce((sum, item) => sum + item.allocatedCents, 0);
  for (const share of shares) {
    if (remainder <= 0) break;
    if (share.allocatedCents < share.availableCents) {
      share.allocatedCents += 1;
      remainder -= 1;
    }
  }
  return shares
    .filter((share) => share.allocatedCents > 0)
    .map((share) => consumeRetirementCapacity(ledger, share.accountId, consumer, share.allocatedCents / 100));
}

export function consumeRetirementCapacityForEqualOwnerTieRecurringMonthly(
  ledger: RetirementCapacityLedger,
  accountIds: string[],
  consumer: RetirementCapacityConsumer,
  requestedMonthlyAmount: number | null,
): RetirementRecurringTieResult {
  const ownerDestinations = [...accountIds]
    .sort()
    .map((accountId) => ({ accountId, entry: ledger.entries.find((item) => item.accountId === accountId) }))
    .filter((item) => item.entry?.ownerPersonId)
    .filter((item, index, all) => all.findIndex((candidate) => candidate.entry!.ownerPersonId === item.entry!.ownerPersonId) === index)
    .map((item) => ({
      ...item,
      availableMonthlyCents: recurringMonthlyCentsFromAnnual(remainingRetirementCapacity(ledger, item.accountId) ?? 0),
    }))
    .filter((item) => item.availableMonthlyCents > 0);
  if (!ownerDestinations.length) return { allocations: [], consumedMonthlyAmount: 0, consumedAnnualAmount: 0 };

  const sharedGroupIds = [...new Set(ownerDestinations
    .map((item) => item.entry?.sharedCapacityGroup)
    .filter((groupId): groupId is string => Boolean(groupId)))];
  const sharedGroup = sharedGroupIds.length === 1
    ? ledger.groups.find((group) => group.id === sharedGroupIds[0])
    : null;
  const ownerAvailableMonthlyCents = ownerDestinations.reduce((sum, item) => sum + item.availableMonthlyCents, 0);
  const sharedAvailableMonthlyCents = sharedGroup
    ? recurringMonthlyCentsFromAnnual(sharedGroup.remainingAnnualRoom)
    : ownerAvailableMonthlyCents;
  const totalAvailableMonthlyCents = Math.min(ownerAvailableMonthlyCents, sharedAvailableMonthlyCents);
  const requestedMonthlyCents = requestedMonthlyAmount === null
    ? totalAvailableMonthlyCents
    : Math.round(Math.max(0, requestedMonthlyAmount) * 100);
  const amountMonthlyCents = Math.min(requestedMonthlyCents, totalAvailableMonthlyCents);
  if (amountMonthlyCents <= 0 || totalAvailableMonthlyCents <= 0) {
    return { allocations: [], consumedMonthlyAmount: 0, consumedAnnualAmount: 0 };
  }

  const shares = ownerDestinations.map((item) => ({
    ...item,
    allocatedMonthlyCents: Math.floor(
      amountMonthlyCents * item.availableMonthlyCents / ownerAvailableMonthlyCents,
    ),
  }));
  let remainder = amountMonthlyCents - shares.reduce((sum, item) => sum + item.allocatedMonthlyCents, 0);
  for (const share of shares) {
    if (remainder <= 0) break;
    if (share.allocatedMonthlyCents < share.availableMonthlyCents) {
      share.allocatedMonthlyCents += 1;
      remainder -= 1;
    }
  }

  const allocations = shares
    .filter((share) => share.allocatedMonthlyCents > 0)
    .map((share): RetirementRecurringTieAllocation => {
      const requestedAnnual = recurringAnnualFromMonthlyCents(share.allocatedMonthlyCents);
      const consumption = consumeRetirementCapacity(ledger, share.accountId, consumer, requestedAnnual);
      if (annualCents(consumption.consumedAnnualAmount) !== share.allocatedMonthlyCents * 12) {
        throw new Error("Recurring retirement tie allocation failed annual-capacity reconciliation.");
      }
      return {
        ...consumption,
        allocatedMonthlyAmount: share.allocatedMonthlyCents / 100,
      };
    });
  const consumedMonthlyCents = allocations.reduce(
    (sum, allocation) => sum + Math.round(allocation.allocatedMonthlyAmount * 100),
    0,
  );
  const consumedAnnualCents = allocations.reduce(
    (sum, allocation) => sum + annualCents(allocation.consumedAnnualAmount),
    0,
  );
  return {
    allocations,
    consumedMonthlyAmount: consumedMonthlyCents / 100,
    consumedAnnualAmount: consumedAnnualCents / 100,
  };
}

export function retirementCapacityInvariantHolds(ledger: RetirementCapacityLedger): boolean {
  const entryInvariant = ledger.entries.every((entry) => {
    if (!entry.verified || entry.originalRemainingAnnualRoom === null) return Object.values(entry.consumed).every((amount) => amount === 0);
    const consumed = roundMoney(Object.values(entry.consumed).reduce((sum, amount) => sum + amount, 0));
    return consumed <= entry.originalRemainingAnnualRoom;
  });
  const groupInvariant = ledger.groups.every((group) => {
    const consumed = roundMoney(Object.values(group.consumed).reduce((sum, amount) => sum + amount, 0));
    return consumed <= group.originalRemainingAnnualRoom;
  });
  return entryInvariant && groupInvariant;
}
