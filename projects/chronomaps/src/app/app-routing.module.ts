import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TimelineMapHComponent } from './timeline-map-h/timeline-map-h.component';
import { DirectoryPageComponent } from './directory-page/directory-page.component';

const routes: Routes = [
  {path: 'map', component: TimelineMapHComponent},
  {path: '', component: DirectoryPageComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
