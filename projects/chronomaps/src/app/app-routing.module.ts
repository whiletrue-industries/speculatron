import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DirectoryPageComponent } from './directory-page/directory-page.component';
import { ChronomapPageComponent } from './chronomap-page/chronomap-page.component';

const routes: Routes = [
  {path: 'map/:slug', component: ChronomapPageComponent},
  {path: '', component: DirectoryPageComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
