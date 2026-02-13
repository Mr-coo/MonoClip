import { Component } from '../components/component';
import { Entity } from '../entities/entity';
import { World } from '../world';

export function addEntity(
  world: World,
) {
  if (world.toAdd.size == 0) return;

  const dto: Record<string, Record<Entity, Component>> = {};

  world.toAdd.forEach((value, key) => {
    world.entities.add(key);

    value.forEach((comp, name) => {
      world.addComponent(key, name, comp);

      if (!dto[name]) {
        dto[name] = {};
      }

      dto[name][key] = comp;
    });
  });
  
  world.toAdd.clear();
}