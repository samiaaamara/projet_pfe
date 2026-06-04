import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { CandidatComponent } from './pages/candidat/candidat.component';
import { FormateurComponent } from './pages/formateur/formateur.component';
import { AdminComponent } from './pages/admin/admin.component';
import { AdminGuard } from './guards/admin.guard';
import { FormateurGuard } from './guards/formateur.guard';
import { ExterneGuard } from './guards/externe.guard';
import { CandidatGuard } from './guards/candidat.guard';
import { AdminLoginComponent } from './pages/admin-login/admin-login.component';
import { HomeComponent } from './pages/home/home.component';
import { InscriptionComponent } from './pages/inscription/inscription.component';
import { ExterneComponent } from './pages/externe/externe.component';
import { PaiementRetourComponent } from './pages/paiement-retour/paiement-retour.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './pages/reset-password/reset-password.component';

export const routes: Routes = [
  { path: 'home', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'inscription', component: InscriptionComponent },
  { path: 'candidat', component: CandidatComponent, canActivate: [CandidatGuard] },
  { path: 'formateur', component: FormateurComponent, canActivate: [FormateurGuard] },
  { path: 'admin', component: AdminComponent, canActivate: [AdminGuard] },
  { path: 'admin-login', component: AdminLoginComponent },
  { path: 'externe', component: ExterneComponent, canActivate: [ExterneGuard] },
  { path: 'paiement-retour', component: PaiementRetourComponent },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: 'home' },
];
