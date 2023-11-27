type Register<T extends string = string, U = unknown, V = unknown> = {
  id: T;
  condition: (
    | ((value: unknown, key: string) => value is U)
    | ((value: unknown, key: string) => boolean)
  );
  serialize: (value: U) => V;
  deserialize: (value: V) => unknown;
};

const undefinedValue = Symbol('undefinedValue');

class JSONSerializeExecutor {
  constructor(private registers: Register[]) {}

  get replacer(): <K extends string>(this: { [V in K]: unknown }, key: K, value: unknown) => unknown {
    const { registers } = this;
    let skipAmount = 0;

    return function(key, val) {
      const e = this[key];

      if(skipAmount) {
        skipAmount--;
        return val;
      }

      for(const { condition, serialize, id } of registers) {
        if(condition(e, key)) {
          skipAmount = 2;

          return {
            __id: id,
            __value: JSON.stringify(serialize(e)),
          };
        }
      }

      return val;
    };
  }

  get reviver(): <K extends string>(this: { [V in K]: unknown }, key: K, value: unknown) => unknown {
    return (_, e) => {
      if(
        e
          && typeof e === 'object'
          && '__id' in e
          && '__value' in e
          && typeof e.__id === 'string'
          && typeof e.__value === 'string'
          && Object.keys(e).length === 2
      ) {
        for(const { id, deserialize } of this.registers) {
          if(e.__id === id) {
            const result = deserialize(JSON.parse(e.__value));

            return result === void 0 ? undefinedValue : result;
          }
        }
      }

      if(e && typeof e === 'object') {
        for(const key of Object.keys(e)) {
          if((e as any)[key] === undefinedValue) {
            (e as any)[key] = void 0;
          }
        }
      }

      return e;
    };
  }
}

class ExtendedJSON {
  private serializeExecutor: JSONSerializeExecutor;

  constructor(registers: Register[]) {
    this.serializeExecutor = new JSONSerializeExecutor(registers);
  }

  stringify<T>(value: T): (T extends undefined ? undefined : string) {
    return JSON.stringify(value, this.serializeExecutor.replacer) as any;
  }
  parse<T>(text: string): T {
    return JSON.parse(text, this.serializeExecutor.reviver);
  }
}

abstract class NotUniqueId<T extends string> {
  private error!: T;
}

type UniqueIdsCheck<NotUniqueIds extends string> = (
  [NotUniqueIds] extends [never] ? [] : [NotUniqueId<NotUniqueIds>]
);

type AllPredefinedKeys = 'set' | 'map' | 'date' | 'undefined';

export class JSONSerializer<
  Predefined extends undefined | 'all' | AllPredefinedKeys[] = never,
  NotUniqueIds extends string = never,
  AllIds extends string = (
    Predefined extends undefined
      ? never
      : (
        Predefined extends 'all'
          ? AllPredefinedKeys
          : Predefined extends unknown[]
            ? Predefined[number]
            : never
      )
  ),
> {
  private registers: Register[] = [];

  constructor(e?: Predefined) {
    if(!e) {
      return;
    }

    if(e === 'all' || e.includes('set')) {
      this.mutableRegister({
        id: 'set',
        condition: (e): e is Set<unknown> => e instanceof Set,
        serialize: e => [...e],
        deserialize: e => new Set(e),
      });
    }
    if(e === 'all' || e.includes('map')) {
      this.mutableRegister({
        id: 'map',
        condition: (e): e is Map<unknown, unknown> => e instanceof Map,
        serialize: e => [...e],
        deserialize: e => new Map(e),
      });
    }
    if(e === 'all' || e.includes('date')) {
      this.mutableRegister({
        id: 'date',
        condition: (e): e is Date => e instanceof Date,
        serialize: e => e.toISOString(),
        deserialize: e => new Date(e),
      });
    }
    if(e === 'all' || e.includes('undefined')) {
      this.mutableRegister({
        id: 'undefined',
        condition: e => e === void 0,
        serialize: () => null,
        deserialize: () => void 0,
      });
    }
  }

  register<T extends string, U, V>(register: Register<T, U, V>) {
    const newSerializer = new JSONSerializer<never, NotUniqueIds | AllIds & T, AllIds | T>();

    newSerializer.registers = [...this.registers, register as Register];

    return newSerializer;
  }

  private mutableRegister<T extends string, U, V>(register: Register<T, U, V>) {
    this.registers = [...this.registers, register as Register];
  }

  makeExecutor(...params: UniqueIdsCheck<NotUniqueIds>) {
    void params;
    return new JSONSerializeExecutor(this.registers);
  }

  makeParser(...params: UniqueIdsCheck<NotUniqueIds>) {
    void params;
    return new ExtendedJSON(this.registers);
  }
}
