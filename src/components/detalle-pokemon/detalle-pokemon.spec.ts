import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetallePokemon } from './detalle-pokemon';

describe('DetallePokemon', () => {
  let component: DetallePokemon;
  let fixture: ComponentFixture<DetallePokemon>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetallePokemon],
    }).compileComponents();

    fixture = TestBed.createComponent(DetallePokemon);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
