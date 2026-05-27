import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FiltroRegiones } from './filtro-regiones';

describe('FiltroRegiones', () => {
  let component: FiltroRegiones;
  let fixture: ComponentFixture<FiltroRegiones>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FiltroRegiones],
    }).compileComponents();

    fixture = TestBed.createComponent(FiltroRegiones);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
