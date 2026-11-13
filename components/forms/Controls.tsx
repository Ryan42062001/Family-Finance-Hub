// Friendlier form controls. They are plain HTML (radio buttons, checkboxes, text inputs) styled as tiles, pills
// and switches, so they work without JavaScript and submit the same field names and values the server expects.

export type ChoiceOption = { value: string; label: string; icon?: string };

// Tap-to-pick tiles (with an icon) or pills (short answers). Exactly one value is submitted. When the saved value
// isn't one of the options, nothing is preselected and the form can't be sent until someone picks, so an
// unexpected saved value is never silently replaced.
export function Choice({ name, legend, options, defaultValue, variant = "tiles", required = true }: {
  name: string; legend: string; options: ChoiceOption[]; defaultValue?: string | null; variant?: "tiles" | "pills"; required?: boolean;
}) {
  return <fieldset className={`choice choice-${variant}`}>
    <legend>{legend}</legend>
    <div className="choice-options">
      {options.map((option, index) => <label key={option.value} className="choice-option">
        <input type="radio" name={name} value={option.value} defaultChecked={defaultValue === option.value} required={required && index === 0} />
        <span className="choice-face">{option.icon ? <span className="choice-icon" aria-hidden="true">{option.icon}</span> : null}<span>{option.label}</span></span>
      </label>)}
    </div>
  </fieldset>;
}

// An on/off switch. Submits "on" when on, nothing when off: the same as the checkbox it replaces.
export function Toggle({ name, label, defaultChecked = false, hint }: { name: string; label: string; defaultChecked?: boolean; hint?: string }) {
  return <label className="switch">
    <input type="checkbox" role="switch" name={name} defaultChecked={defaultChecked} />
    <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>
    <span className="switch-text"><span>{label}</span>{hint ? <small>{hint}</small> : null}</span>
  </label>;
}

export function TextField({ name, label, example, defaultValue, required = false, maxLength = 100, multiline = false }: {
  name: string; label: string; example?: string; defaultValue?: string | null; required?: boolean; maxLength?: number; multiline?: boolean;
}) {
  return <label className="field">
    <span className="field-label">{label}</span>
    {multiline
      ? <textarea name={name} maxLength={maxLength} required={required} defaultValue={defaultValue ?? ""} placeholder={example} />
      : <input name={name} maxLength={maxLength} required={required} defaultValue={defaultValue ?? ""} placeholder={example} />}
  </label>;
}
