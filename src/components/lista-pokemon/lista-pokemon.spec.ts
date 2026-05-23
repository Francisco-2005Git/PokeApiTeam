import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListaPokemon } from './lista-pokemon';

describe('ListaPokemon', () => {
  let component: ListaPokemon;
  let fixture: ComponentFixture<ListaPokemon>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaPokemon],
    }).compileComponents();

    fixture = TestBed.createComponent(ListaPokemon);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
