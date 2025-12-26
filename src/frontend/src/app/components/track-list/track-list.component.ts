import {Component, Input} from '@angular/core';
import {CommonModule, NgFor, NgSwitch, NgSwitchCase} from "@angular/common";
import {TrackService} from "../../services/track.service";
import {Observable} from "rxjs";
import {Track, TrackStatusEnum} from "../../models/track";
import {I18nService} from "../../services/i18n.service";

@Component({
    selector: 'app-track-list',
    imports: [CommonModule, NgFor, NgSwitch, NgSwitchCase],
    templateUrl: './track-list.component.html',
    styleUrl: './track-list.component.scss',
  standalone: true,
})
export class TrackListComponent {

  @Input() set playlistId(value: number) {
    this.tracks$ = this.service.getAllByPlaylist(value);
  }
  tracks$!: Observable<Track[]>;
  trackStatuses = TrackStatusEnum;

  constructor(
    private readonly service: TrackService,
    public readonly i18n: I18nService,
  ) { }

  delete(id: number): void {
    this.service.delete(id);
  }

  retry(id: number): void {
    this.service.retry(id);
  }
}
