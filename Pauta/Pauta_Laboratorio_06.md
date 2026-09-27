# Pauta — Laboratorio 6: Probando el Backend

## Índice

1. [Prerrequisitos e Instalación](#1-prerrequisitos-e-instalación)
2. [Estructura del Proyecto](#2-estructura-del-proyecto)
3. [P1 — Tests unitarios: `filterPostsByWord`](#3-p1--tests-unitarios-filterpostsbyword)
4. [P2 — Tests de integración básicos (GET)](#4-p2--tests-de-integración-básicos-get)
5. [P3 — Forma de respuestas y manejo de errores](#5-p3--forma-de-respuestas-y-manejo-de-errores)
6. [P4 — Validación de POST](#6-p4--validación-de-post)
7. [P5 — Comentarios huérfanos](#7-p5--comentarios-huérfanos)
8. [P6 — PUT /api/posts/:id](#8-p6--put-apipostsid)
9. [Resumen de archivos modificados/creados](#9-resumen-de-archivos-modificadoscreados)
10. [Ejecución de tests](#10-ejecución-de-tests)

---

## 1. Prerrequisitos e Instalación

### Software necesario

| Software | Versión mínima | Propósito |
|---|---|---|
| **Node.js** | v18+ | Runtime del servidor |
| **npm** | v9+ | Gestor de paquetes |
| **MongoDB** | v6+ | Base de datos (local o Docker) |
| **Docker** (opcional) | v20+ | Para ejecutar MongoDB sin instalación |

### Instalación de MongoDB (elegir una opción)

**Opción A — Con Docker** (recomendada):
```bash
docker run -d -p 27017:27017 mongo:8
```

**Opción B — MongoDB Community**:
Descargar desde [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community) e instalar según el sistema operativo.

### Preparación del proyecto

Desde la carpeta `Template Lab 6/backend`, ejecutar:

```bash
npm install
```

### Archivo `.env`

Crear un archivo `.env` en `backend/` con el siguiente contenido:

```env
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DBNAME=lab6-dev
PORT=3001
HOST=localhost
```

### Actualización de `package.json`

El script `test` original usa sintaxis Unix para variables de entorno. Para compatibilidad con Windows, se usa `cross-env`. Modificar la sección `"scripts"` y agregar `cross-env` a `devDependencies`:

```diff
  "scripts": {
-   "test": "MONGODB_DBNAME=lab6-test tsx --test --test-concurrency=1 test/**/*.test.ts",
+   "test": "cross-env MONGODB_DBNAME=lab6-test tsx --test --test-concurrency=1 test/**/*.test.ts",
+   "test:unit": "tsx --test test/unit.test.ts",
+   "test:integration": "cross-env MONGODB_DBNAME=lab6-test tsx --test --test-concurrency=1 test/integration.test.ts",
    ...
  },
  "devDependencies": {
+   "cross-env": "^7.0.3",
    ...
  }
```

Luego ejecutar:
```bash
npm install
```

> [!NOTE]
> En Linux/Mac, `cross-env` no es necesario; el script original funciona tal cual. Se agrega para compatibilidad con Windows.

---

## 2. Estructura del Proyecto

Al finalizar, la estructura será:

```
backend/
├── .env
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              ← Punto de entrada (sin cambios)
│   ├── app.ts                ← Rutas y middlewares (modificado en P3, P5, P6)
│   ├── models/
│   │   └── posts.ts          ← Modelo Mongoose (corregido en P3, P4)
│   └── utils/
│       └── filterPostsByWord.ts  ← Función pura (creada en P1)
└── test/
    ├── unit.test.ts           ← Tests unitarios (P1)
    └── integration.test.ts    ← Tests de integración (P2–P6)
```

---

## 3. P1 — Tests unitarios: `filterPostsByWord`

### 3.1 Crear la función (después de escribir los tests)

El enunciado pide **escribir los tests primero** y luego la implementación. Aquí documentamos ambos.

#### Crear `src/utils/filterPostsByWord.ts`

```typescript
import { Post } from "../models/posts";

/**
 * Filtra posts que contengan la palabra `query` como palabra completa en su contenido.
 * - La búsqueda es case insensitive.
 * - Ignora la puntuación adyacente a las palabras.
 * - Solo coincide con palabras completas (no subcadenas).
 * - Retorna un arreglo vacío si `posts` está vacío, `query` es vacío, o no hay coincidencias.
 */
export function filterPostsByWord(posts: Post[], query: string): Post[] {
  if (posts.length === 0 || query === "") {
    return [];
  }

  const lowerQuery = query.toLowerCase();

  return posts.filter((post) => {
    // Eliminar puntuación y separar en palabras
    const words = post.content
      .toLowerCase()
      .replace(/[^\w\sáéíóúñü]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 0);

    return words.includes(lowerQuery);
  });
}
```

**Explicación de la lógica:**

1. **Retorno temprano**: si `posts` está vacío o `query` es `""`, se retorna `[]` inmediatamente.
2. **Case insensitive**: se convierte tanto `query` como el contenido a minúsculas.
3. **Ignorar puntuación**: `replace(/[^\w\sáéíóúñü]/g, " ")` reemplaza todo carácter que no sea alfanumérico, espacio o acentuado por un espacio. Así "Bakemon," se convierte en "Bakemon ".
4. **Palabras completas**: se parte el string en palabras con `split(/\s+/)` y se usa `includes` para buscar coincidencia exacta en el arreglo.

### 3.2 Crear los tests: `test/unit.test.ts`

```typescript
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { filterPostsByWord } from "../src/utils/filterPostsByWord";
import { Post } from "../src/models/posts";
import mongoose from "mongoose";

// Helper para crear posts de prueba rápidamente
function makePost(content: string): Post {
  return {
    content,
    author: "test",
    createdAt: new Date(),
    updatedAt: new Date(),
    likes: 0,
    dislikes: 0,
  };
}

describe("filterPostsByWord", () => {
  // ===== Requerimiento 1: Búsqueda de palabras en el contenido =====

  it("encuentra posts que contienen la palabra buscada", () => {
    const posts = [
      makePost("Hoy es un buen día"),
      makePost("No hay nada que hacer"),
      makePost("Buen provecho a todos"),
    ];
    const result = filterPostsByWord(posts, "buen");
    assert.equal(result.length, 2);
  });

  it("la búsqueda es case insensitive", () => {
    const posts = [
      makePost("PALABRA importante"),
      makePost("otra Palabra aquí"),
      makePost("también palabra minúscula"),
    ];
    const result = filterPostsByWord(posts, "palabra");
    assert.equal(result.length, 3);
  });

  it("la búsqueda ignora la puntuación adyacente", () => {
    const posts = [
      makePost("Es Bakemon, no Pokemon"),
      makePost("El bakemon. es genial"),
      makePost("¡Bakemon!"),
    ];
    const result = filterPostsByWord(posts, "bakemon");
    assert.equal(result.length, 3);
  });

  it("solo coincide con palabras completas, no subcadenas", () => {
    const posts = [
      makePost("El girasol es bonito"),
      makePost("El sol brilla fuerte"),
      makePost("Un parasol grande"),
    ];
    const result = filterPostsByWord(posts, "sol");
    assert.equal(result.length, 1);
    assert.equal(result[0].content, "El sol brilla fuerte");
  });

  // ===== Requerimiento 2: Casos de arreglo vacío =====

  it("retorna arreglo vacío si posts está vacío", () => {
    const result = filterPostsByWord([], "algo");
    assert.deepEqual(result, []);
  });

  it("retorna arreglo vacío si query es un string vacío", () => {
    const posts = [makePost("Hola mundo")];
    const result = filterPostsByWord(posts, "");
    assert.deepEqual(result, []);
  });

  it("retorna arreglo vacío si ningún post contiene la palabra", () => {
    const posts = [
      makePost("Hoy es un buen día"),
      makePost("Todo está genial"),
    ];
    const result = filterPostsByWord(posts, "inexistente");
    assert.deepEqual(result, []);
  });
});
```

**Verificar con:**
```bash
npm run test:unit
```

---

## 4. P2 — Tests de integración básicos (GET)

### 4.1 Crear `test/integration.test.ts`

Archivo con la configuración base: conexión a la BD, siembra de datos y cierre de conexión.

```typescript
import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import supertest from "supertest";
import mongoose from "mongoose";
import app from "../src/app";
import PostModel from "../src/models/posts";

const api = supertest(app);

// Variables para almacenar los IDs de los datos sembrados
let thread1Id: string;
let thread2Id: string;
let comment1InThread1Id: string;
let comment2InThread1Id: string;
let commentInThread2Id: string;

before(async () => {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
  const dbName = process.env.MONGODB_DBNAME || "lab6-test";
  await mongoose.connect(uri, { dbName });
});

beforeEach(async () => {
  // Limpiar la colección
  await PostModel.deleteMany({});

  // Sembrar thread 1 con 2 comentarios
  const t1 = await new PostModel({
    content: "Thread 1: Hola mundo",
    author: "Alice",
    thread: null,
  }).save();
  thread1Id = t1._id.toString();

  const c1 = await new PostModel({
    content: "Comentario 1 en thread 1",
    author: "Bob",
    thread: t1._id,
  }).save();
  comment1InThread1Id = c1._id.toString();

  const c2 = await new PostModel({
    content: "Comentario 2 en thread 1",
    author: "Charlie",
    thread: t1._id,
    parent: c1._id,
  }).save();
  comment2InThread1Id = c2._id.toString();

  // Sembrar thread 2 con 1 comentario
  const t2 = await new PostModel({
    content: "Thread 2: Otro tema",
    author: "Diana",
    thread: null,
  }).save();
  thread2Id = t2._id.toString();

  const c3 = await new PostModel({
    content: "Comentario en thread 2",
    author: "Eve",
    thread: t2._id,
  }).save();
  commentInThread2Id = c3._id.toString();
});

after(async () => {
  await mongoose.connection.close();
});
```

**Puntos clave del setup:**
- `before`: se conecta a MongoDB (la variable `MONGODB_DBNAME=lab6-test` viene del script `npm test`).
- `beforeEach`: limpia la colección con `deleteMany({})` y siembra 2 threads con comentarios.
- `after`: cierra la conexión para que el proceso de pruebas termine.

### 4.2 Tests de P2

```typescript
describe("P2: GET /api/threads", () => {
  it("devuelve solo los threads (no los comentarios)", async () => {
    const response = await api
      .get("/api/threads")
      .expect(200)
      .expect("Content-Type", /application\/json/);

    assert.equal(response.body.length, 2);
  });
});

describe("P2: GET /api/threads/:id", () => {
  it("devuelve el thread con todos sus comentarios", async () => {
    const response = await api
      .get(`/api/threads/${thread1Id}`)
      .expect(200)
      .expect("Content-Type", /application\/json/);

    assert.ok(response.body.thread);
    assert.equal(response.body.comments.length, 2);
  });
});
```

> [!IMPORTANT]
> Estos tests no requieren cambios en el backend. La funcionalidad ya existe.

---

## 5. P3 — Forma de respuestas y manejo de errores

### 5.1 Tests

```typescript
describe("P3: Forma de las respuestas", () => {
  it("el identificador se llama id y no _id, y no trae __v", async () => {
    const response = await api.get("/api/threads").expect(200);

    for (const thread of response.body) {
      assert.ok(thread.id, "Debe tener propiedad id");
      assert.equal(thread._id, undefined, "No debe tener _id");
      assert.equal(thread.__v, undefined, "No debe tener __v");
    }

    const threadResponse = await api
      .get(`/api/threads/${thread1Id}`)
      .expect(200);

    assert.ok(threadResponse.body.thread.id);
    assert.equal(threadResponse.body.thread._id, undefined);
    assert.equal(threadResponse.body.thread.__v, undefined);

    for (const comment of threadResponse.body.comments) {
      assert.ok(comment.id, "Comentario debe tener id");
      assert.equal(comment._id, undefined, "Comentario no debe tener _id");
      assert.equal(comment.__v, undefined, "Comentario no debe tener __v");
    }
  });

  it("GET /api/threads/:id con un id válido pero que no existe responde 404", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await api.get(`/api/threads/${fakeId}`).expect(404);
  });

  it("GET /api/threads/:id con un id mal formado responde 400", async () => {
    await api.get("/api/threads/idmalformado").expect(400);
  });

  it("una ruta que no existe responde 404 con un cuerpo JSON con el error", async () => {
    const response = await api
      .get("/api/ruta-inexistente")
      .expect(404)
      .expect("Content-Type", /application\/json/);

    assert.ok(response.body.error);
  });
});
```

### 5.2 Cambios necesarios en el backend

#### 5.2.1 Fix en `src/models/posts.ts` — mover `toJSON` ANTES del modelo

En el template original, `postSchema.set("toJSON", ...)` está **después** de `mongoose.model(...)`. Esto causa que la transformación no se aplique correctamente en algunas versiones. **Mover la transformación antes de crear el modelo:**

```diff
+ postSchema.set("toJSON", {
+   transform: (
+     _,
+     returnedObject: { id?: string; _id?: mongoose.Types.ObjectId; __v?: number }
+   ) => {
+     returnedObject.id = returnedObject._id?.toString();
+     delete returnedObject._id;
+     delete returnedObject.__v;
+   },
+ });
+
  const PostModel = mongoose.model<Post>("Post", postSchema);

- postSchema.set("toJSON", {
-   transform: (
-     _,
-     returnedObject: { id?: string; _id?: mongoose.Types.ObjectId; __v?: number }
-   ) => {
-     returnedObject.id = returnedObject._id?.toString();
-     delete returnedObject._id;
-     delete returnedObject.__v;
-   },
- });

  export default PostModel;
```

#### 5.2.2 Agregar middleware `unknownEndpoint` en `src/app.ts`

Para que rutas no definidas respondan 404 con JSON, agregar **después de todas las rutas y ANTES del `errorHandler`**:

```typescript
const unknownEndpoint = (request: Request, response: Response) => {
  response.status(404).json({ error: "unknown endpoint" });
};
app.use(unknownEndpoint);
```

> [!WARNING]
> El orden de los middleware es crucial. `unknownEndpoint` debe ir DESPUÉS de todas las rutas y ANTES del `errorHandler`. Si se coloca mal, interceptará rutas válidas o no se ejecutará nunca.

---

## 6. P4 — Validación de POST

### 6.1 Tests

Se testean las mismas validaciones para **crear thread** (`POST /api/threads`) y **crear comentario** (`POST /api/threads/:id`):

```typescript
describe("P4: POST /api/threads (crear thread)", () => {
  it("con contenido válido responde 201 y agrega exactamente una publicación", async () => {
    const before = await PostModel.countDocuments();
    await api
      .post("/api/threads")
      .send({ content: "Nuevo thread válido", author: "Tester" })
      .expect(201);
    const after = await PostModel.countDocuments();
    assert.equal(after - before, 1);
  });

  it("si el contenido no viene, responde 400 y no agrega nada", async () => {
    const before = await PostModel.countDocuments();
    await api.post("/api/threads").send({ author: "Tester" }).expect(400);
    const after = await PostModel.countDocuments();
    assert.equal(after, before);
  });

  it("si el contenido excede 300 caracteres responde 400; con exactamente 300 se acepta", async () => {
    const before = await PostModel.countDocuments();

    // 301 caracteres → rechazado
    await api.post("/api/threads").send({ content: "a".repeat(301) }).expect(400);
    const afterReject = await PostModel.countDocuments();
    assert.equal(afterReject, before);

    // Exactamente 300 caracteres → aceptado
    await api.post("/api/threads").send({ content: "a".repeat(300) }).expect(201);
    const afterAccept = await PostModel.countDocuments();
    assert.equal(afterAccept - before, 1);
  });

  it("si el contenido es string vacío responde 400", async () => {
    await api.post("/api/threads").send({ content: "" }).expect(400);
  });

  it("si author no viene, la publicación se guarda con éxito", async () => {
    const before = await PostModel.countDocuments();
    await api.post("/api/threads").send({ content: "Thread sin autor" }).expect(201);
    const after = await PostModel.countDocuments();
    assert.equal(after - before, 1);
  });

  it("si author es un nombre prohibido responde 400 y no agrega nada", async () => {
    const before = await PostModel.countDocuments();
    await api
      .post("/api/threads")
      .send({ content: "Contenido válido", author: "Huevito Rey" })
      .expect(400);
    const after = await PostModel.countDocuments();
    assert.equal(after, before);
  });

  it("nombre prohibido con otra capitalización (HUEVITO REY) responde 400", async () => {
    const before = await PostModel.countDocuments();
    await api
      .post("/api/threads")
      .send({ content: "Contenido válido", author: "HUEVITO REY" })
      .expect(400);
    const after = await PostModel.countDocuments();
    assert.equal(after, before);
  });
});
```

Los tests para `POST /api/threads/:id` son análogos, cambiando la URL por `` `/api/threads/${thread1Id}` ``.

### 6.2 Cambios necesarios — Fix del validador de nombres prohibidos

En el template original, la lista `BANNED` contiene los nombres con la capitalización original, pero `isNotBanned` compara usando `v.toLowerCase()`. La lista debe estar en minúsculas:

```diff
- const BANNED = ["Huevito Rey", "Matías Toro", "Memes es mal ramo"];
+ const BANNED = ["huevito rey", "matías toro", "memes es mal ramo"];
```

> [!IMPORTANT]
> Sin este cambio, "HUEVITO REY".toLowerCase() → "huevito rey" no estaría en ["Huevito Rey", ...], así que el validador lo aceptaría incorrectamente.

---

## 7. P5 — Comentarios huérfanos

### 7.1 Tests

```typescript
describe("P5: Comentarios huérfanos", () => {
  it("POST /api/threads/:id con un id de thread válido pero inexistente responde 404", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const before = await PostModel.countDocuments();
    await api
      .post(`/api/threads/${fakeId}`)
      .send({ content: "Comentario huérfano" })
      .expect(404);
    const after = await PostModel.countDocuments();
    assert.equal(after, before);
  });

  it("POST /api/threads/:id con parent de otro thread responde 400", async () => {
    const before = await PostModel.countDocuments();
    // Usar un comentario del thread 2 como parent en el thread 1
    await api
      .post(`/api/threads/${thread1Id}`)
      .send({ content: "Comentario con parent inválido", parent: commentInThread2Id })
      .expect(400);
    const after = await PostModel.countDocuments();
    assert.equal(after, before);
  });

  it("POST /api/threads/:id con parent válido del mismo thread responde 201", async () => {
    await api
      .post(`/api/threads/${thread1Id}`)
      .send({ content: "Respuesta al comentario 1", parent: comment1InThread1Id })
      .expect(201);
  });
});
```

### 7.2 Cambios necesarios en `src/app.ts` — Validar thread y parent

Reescribir el handler de `POST /api/threads/:id` usando `async/await`:

```typescript
app.post("/api/threads/:id", async (request, response, next) => {
  try {
    const body = request.body;
    const threadId = request.params.id;

    // Verificar que el thread existe
    const thread = await PostModel.findById(threadId);
    if (!thread) {
      return response.status(404).json({ error: "Thread not found" });
    }

    // Verificar que es un thread (no un comentario)
    if (thread.thread !== null) {
      return response.status(400).json({ error: "Not a thread" });
    }

    // Si se proporciona parent, verificar que pertenece a este thread
    if (body.parent) {
      const parentPost = await PostModel.findById(body.parent);
      if (!parentPost || parentPost.thread?.toString() !== threadId) {
        return response.status(400).json({ error: "Parent does not belong to this thread" });
      }
    }

    const post = new PostModel({
      content: body.content,
      author: body.author,
      thread: threadId,
      parent: body.parent,
    });

    const savedPost = await post.save();
    response.status(201).json(savedPost);
  } catch (error) {
    next(error);
  }
});
```

**Lógica de validación:**

1. **Thread existe**: `findById(threadId)` — si es `null`, responder 404.
2. **Es un thread**: si `thread.thread !== null`, significa que es un comentario, no un thread.
3. **Parent válido**: si se envía `body.parent`, verificar que el parent pertenece al mismo thread comparando `parentPost.thread?.toString() !== threadId`.

---

## 8. P6 — PUT /api/posts/:id

### 8.1 Tests

```typescript
describe("P6: PUT /api/posts/:id", () => {
  it("con cuerpo válido responde 200 y el cambio queda guardado", async () => {
    const response = await api
      .put(`/api/posts/${thread1Id}`)
      .send({ likes: 5 })
      .expect(200);
    assert.equal(response.body.likes, 5);

    // Verificar que quedó guardado
    const post = await PostModel.findById(thread1Id);
    assert.equal(post!.likes, 5);
  });

  it("con id válido pero inexistente responde 404", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await api.put(`/api/posts/${fakeId}`).send({ likes: 1 }).expect(404);
  });

  it("contenido mayor a 300 caracteres responde 400 y no modifica", async () => {
    const before = await PostModel.findById(thread1Id);
    await api
      .put(`/api/posts/${thread1Id}`)
      .send({ content: "a".repeat(301) })
      .expect(400);
    const after = await PostModel.findById(thread1Id);
    assert.equal(after!.content, before!.content);
  });

  it("contenido vacío responde 400 y no modifica", async () => {
    const before = await PostModel.findById(thread1Id);
    await api
      .put(`/api/posts/${thread1Id}`)
      .send({ content: "" })
      .expect(400);
    const after = await PostModel.findById(thread1Id);
    assert.equal(after!.content, before!.content);
  });

  it("autor prohibido responde 400 y no modifica", async () => {
    const before = await PostModel.findById(thread1Id);
    await api
      .put(`/api/posts/${thread1Id}`)
      .send({ author: "Huevito Rey" })
      .expect(400);
    const after = await PostModel.findById(thread1Id);
    assert.equal(after!.author, before!.author);
  });
});
```

### 8.2 Cambios necesarios en `src/app.ts` — `runValidators: true`

El template original usa `findByIdAndUpdate` **sin** `runValidators`. Mongoose no ejecuta validaciones del schema en updates por defecto. Se debe agregar la opción:

```diff
  app.put("/api/posts/:id", async (request, response, next) => {
    try {
      const body = request.body;
      const id = request.params.id;

-     PostModel.findByIdAndUpdate(id, body, { new: true })
-       .then((updatedPost) => {
+     const updatedPost = await PostModel.findByIdAndUpdate(id, body, {
+       new: true,
+       runValidators: true,
+     });
+
          if (updatedPost) {
            response.json(updatedPost);
          } else {
            response.status(404).end();
          }
-       })
-       .catch((error) => next(error));
+   } catch (error) {
+     next(error);
+   }
  });
```

> [!IMPORTANT]
> `runValidators: true` es la clave para que las validaciones del schema (minlength, maxlength, validador de nombres prohibidos) se apliquen también en actualizaciones, no solo en creaciones.

---

## 9. Resumen de archivos modificados/creados

### Archivos NUEVOS (crear)

| Archivo | Propósito |
|---|---|
| `backend/.env` | Variables de entorno |
| `backend/src/utils/filterPostsByWord.ts` | Función `filterPostsByWord` (P1) |
| `backend/test/unit.test.ts` | Tests unitarios (P1) |
| `backend/test/integration.test.ts` | Tests de integración (P2–P6) |

### Archivos MODIFICADOS

| Archivo | Cambios |
|---|---|
| `backend/package.json` | Script `test` con `cross-env`, scripts `test:unit` y `test:integration`, dependencia `cross-env` |
| `backend/src/models/posts.ts` | (1) `BANNED` en minúsculas, (2) `toJSON` antes de `mongoose.model()` |
| `backend/src/app.ts` | (1) Middleware `unknownEndpoint`, (2) Validación de thread/parent en `POST /api/threads/:id`, (3) `runValidators: true` en `PUT /api/posts/:id` |

---

## 10. Ejecución de tests

### Tests unitarios (no requieren MongoDB)

```bash
npm run test:unit
```

Resultado esperado: **7 tests pasando**.

### Tests de integración (requieren MongoDB corriendo)

```bash
npm run test:integration
```

Resultado esperado: **24 tests pasando**.

### Todos los tests

```bash
npm test
```

Resultado esperado: **31 tests pasando** (7 unitarios + 24 de integración).

> [!CAUTION]
> Si los tests de integración fallan con `ECONNREFUSED`, asegúrese de que MongoDB esté corriendo en `localhost:27017`. Con Docker: `docker run -d -p 27017:27017 mongo:8`.

### Ejecución del servidor en desarrollo

```bash
npm run dev
```

El servidor correrá en `http://localhost:3001`.

---

## Resumen de bugs corregidos

| Bug | Ubicación | Problema | Solución |
|---|---|---|---|
| `toJSON` no funciona | `posts.ts` L48-59 | Se define después del modelo | Mover antes de `mongoose.model()` |
| Nombres prohibidos con mayúsculas aceptados | `posts.ts` L27 | BANNED tiene mayúsculas, se compara con `toLowerCase()` | Guardar BANNED en minúsculas |
| Rutas inexistentes responden 200 | `app.ts` | Falta middleware `unknownEndpoint` | Agregar antes del `errorHandler` |
| Comentarios huérfanos permitidos | `app.ts` POST `/api/threads/:id` | No se valida existencia de thread ni parent | Agregar validación con `findById` |
| Validaciones no corren en PUT | `app.ts` PUT `/api/posts/:id` | `findByIdAndUpdate` sin `runValidators` | Agregar `runValidators: true` |
