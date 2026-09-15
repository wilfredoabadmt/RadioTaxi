import React from 'react';
import SectionCard from './SectionCard';

describe('Dispatch Dashboard Components (Fase 9.3 - Testing Apps)', () => {
  it('debe instanciarse correctamente como componente funcional React', () => {
    const element = React.createElement(
      SectionCard,
      {
        title: 'Monitor de Flota',
        description: 'Vehículos en tiempo real en la ciudad de La Paz',
      },
      React.createElement('div', { id: 'child-content' }, 'Contenido del mapa'),
    );

    expect(element).toBeDefined();
    expect(element.props.title).toBe('Monitor de Flota');
    expect(element.props.description).toBe('Vehículos en tiempo real en la ciudad de La Paz');
    expect(element.props.children).toBeDefined();
  });
});
