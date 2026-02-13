import { Component } from "./components/component";
import { Entity } from "./entities/entity";

export class World {
  entities = new Set<Entity>();
  components = new Map<string, Map<Entity, Component>>();
  toRemove = new Set<Entity>();
  toAdd = new Map<Entity, Map<string, Component>>();

  addToAdd(entity: Entity, comp: Map<string, Component>) {
    this.toAdd.set(entity, comp);
  }

  addToRemove(entity: Entity) {
    this.toRemove.add(entity);
  }

  addComponent<T extends Component>(
    entity: Entity,
    name: string,
    component: T,
  ): Map<Entity, Component> {
    if (!this.components.has(name)) {
      this.components.set(name, new Map());
    }
    return this.components.get(name)!.set(entity, component);
  }

  get<T extends Component>(
    entity: Entity,
    cls: new (...a: any[]) => T,
  ): T | undefined {
    return this.components.get(cls.name)?.get(entity) as T;
  }

  query(...components: Function[]): Entity[] {
    return [...this.entities].filter((e) =>
      components.every((c) => this.components.get(c.name)?.has(e)),
    );
  }
}