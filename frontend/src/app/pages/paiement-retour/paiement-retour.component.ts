import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ExterneService } from '../../services/externe.service';

@Component({
  selector: 'app-paiement-retour',
  standalone: true,
  imports: [CommonModule ],

  templateUrl: './paiement-retour.component.html',
  styleUrl: './paiement-retour.component.css',
})
export class PaiementRetourComponent implements OnInit {
  statut: 'chargement' | 'succes' | 'echec' | 'erreur' = 'chargement';
  message = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private externeService: ExterneService
  ) {}

  ngOnInit() {
    const params = this.route.snapshot.queryParamMap;
    const statusParam = params.get('status');
    // Stripe redirige avec ?session_id=cs_xxx (injecté automatiquement via {CHECKOUT_SESSION_ID})
    const paymentRef = params.get('session_id');

    if (statusParam === 'echec') {
      this.statut = 'echec';
      this.message = 'Le paiement a été annulé ou a échoué.';
      return;
    }

    if (!paymentRef) {
      this.statut = 'erreur';
      this.message = 'Référence de paiement introuvable.';
      return;
    }

    this.externeService.confirmerPaiement(paymentRef).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.statut = 'succes';
          this.message = 'Paiement confirmé ! Vous avez maintenant accès à la formation.';
        } else {
          this.statut = 'echec';
          this.message = res.message || 'Le paiement n\'a pas pu être confirmé.';
        }
      },
      error: () => {
        this.statut = 'erreur';
        this.message = 'Erreur lors de la vérification du paiement. Veuillez contacter le support.';
      },
    });
  }

  retourDashboard() {
    this.router.navigate(['/externe']);
  }
}
