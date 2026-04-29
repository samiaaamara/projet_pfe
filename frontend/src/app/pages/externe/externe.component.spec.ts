import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExterneComponent } from './externe.component';

describe('Externe', () => {
  let component: ExterneComponent;
  let fixture: ComponentFixture<ExterneComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExterneComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExterneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
