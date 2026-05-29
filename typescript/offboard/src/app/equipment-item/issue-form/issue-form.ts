import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-issue-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './issue-form.html',
  styleUrl: './issue-form.css',
})
export class IssueForm {
  equipmentId = input.required<string>();

  reported = output<string>();
  cancelled = output();

  protected note = signal('');

  protected onNoteInput(event: Event): void {
    this.note.set((event.target as HTMLTextAreaElement).value);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.reported.emit(this.note());
  }
}
