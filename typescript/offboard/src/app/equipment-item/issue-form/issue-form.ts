import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

const MOCK_NOTES = [
  'Device shows signs of physical damage — screen has a visible crack in the lower-left corner and the chassis is slightly bent.',
  'Equipment was not returned by the employee during the offboarding session. Last known location: open-space desk, 3rd floor.',
  'Battery no longer holds charge — device shuts down after approximately 10 minutes of use even when fully charged.',
  'Keyboard has several non-functional keys (Q, W, backspace). Likely caused by liquid spillage.',
  'Device is functional but the charger cable is missing. Adapter was not included at the time of return.',
  'Monitor returned with dead pixels in the center of the screen and a persistent horizontal line artifact.',
  'Laptop returned without the docking station or peripherals that were originally issued with it.',
  'Device has an unknown software issue — fails to boot past the login screen. Requires IT inspection.',
];

@Component({
  selector: 'app-issue-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './issue-form.html',
  styleUrl: './issue-form.css',
})
export class IssueForm {
  equipmentId = input.required<string>();
  initialNote = input<string>('');

  reported = output<string>();
  noteChange = output<string>();
  cancelled = output();

  protected note = signal(this.initialNote());
  protected isSuggesting = signal(false);

  protected onNoteInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.note.set(value);
    this.noteChange.emit(value);
  }

  protected suggestNote(): void {
    this.isSuggesting.set(true);
    setTimeout(() => {
      const random = MOCK_NOTES[Math.floor(Math.random() * MOCK_NOTES.length)];
      this.note.set(random);
      this.isSuggesting.set(false);
    }, 2000);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.reported.emit(this.note());
  }
}
