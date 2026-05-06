import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent implements OnInit {

  user: any = null;

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadUser();

    // 🔥 IMPORTANT : refresh navbar à chaque navigation
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.loadUser();
      }
    });
  }

  loadUser() {
    const data = localStorage.getItem('user');
    this.user = data ? JSON.parse(data) : null;
  }

  logout() {
    localStorage.clear();
    this.user = null;
    this.router.navigate(['/login']);
  }
}