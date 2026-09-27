import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import supertest from "supertest";
import mongoose from "mongoose";
import app from "../src/app";
import PostModel from "../src/models/posts";

const api = supertest(app);

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
  await PostModel.deleteMany({});

  const t1 = await new PostModel({ content: "Thread 1: Hola mundo", author: "Alice", thread: null }).save();
  thread1Id = t1._id.toString();

  const c1 = await new PostModel({ content: "Comentario 1 en thread 1", author: "Bob", thread: t1._id }).save();
  comment1InThread1Id = c1._id.toString();

  const c2 = await new PostModel({ content: "Comentario 2 en thread 1", author: "Charlie", thread: t1._id, parent: c1._id }).save();
  comment2InThread1Id = c2._id.toString();

  const t2 = await new PostModel({ content: "Thread 2: Otro tema", author: "Diana", thread: null }).save();
  thread2Id = t2._id.toString();

  const c3 = await new PostModel({ content: "Comentario en thread 2", author: "Eve", thread: t2._id }).save();
  commentInThread2Id = c3._id.toString();
});

after(async () => {
  await mongoose.connection.close();
});


describe("P2: GET /api/threads", () => {
  it("devuelve solo los threads (no los comentarios)", async () => {
    const response = await api.get("/api/threads").expect(200).expect("Content-Type", /application\/json/);
    assert.equal(response.body.length, 2);
  });
});

describe("P2: GET /api/threads/:id", () => {
  it("devuelve el thread con todos sus comentarios", async () => {
    const response = await api.get(`/api/threads/${thread1Id}`).expect(200).expect("Content-Type", /application\/json/);
    assert.ok(response.body.thread);
    assert.equal(response.body.comments.length, 2);
  });
});

describe("P3: Forma de las respuestas", () => {
  it("el identificador se llama id y no _id, y no trae __v", async () => {
    const response = await api.get("/api/threads").expect(200);
    for (const thread of response.body) {
      assert.ok(thread.id);
      assert.equal(thread._id, undefined);
      assert.equal(thread.__v, undefined);
    }
    const threadResponse = await api.get(`/api/threads/${thread1Id}`).expect(200);
    assert.ok(threadResponse.body.thread.id);
    assert.equal(threadResponse.body.thread._id, undefined);
    assert.equal(threadResponse.body.thread.__v, undefined);
    for (const comment of threadResponse.body.comments) {
      assert.ok(comment.id);
      assert.equal(comment._id, undefined);
      assert.equal(comment.__v, undefined);
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
    const response = await api.get("/api/ruta-inexistente").expect(404).expect("Content-Type", /application\/json/);
    assert.ok(response.body.error);
  });
});

describe("P4: POST /api/threads (crear thread)", () => {
  it("con contenido válido responde 201 y agrega exactamente una publicación", async () => {
    const before = await PostModel.countDocuments();
    await api.post("/api/threads").send({ content: "Nuevo thread válido", author: "Tester" }).expect(201);
    assert.equal((await PostModel.countDocuments()) - before, 1);
  });

  it("si el contenido no viene, responde 400 y no agrega nada", async () => {
    const before = await PostModel.countDocuments();
    await api.post("/api/threads").send({ author: "Tester" }).expect(400);
    assert.equal(await PostModel.countDocuments(), before);
  });

  it("si el contenido excede 300 caracteres responde 400; con exactamente 300 se acepta", async () => {
    const before = await PostModel.countDocuments();
    await api.post("/api/threads").send({ content: "a".repeat(301) }).expect(400);
    assert.equal(await PostModel.countDocuments(), before);
    await api.post("/api/threads").send({ content: "a".repeat(300) }).expect(201);
    assert.equal((await PostModel.countDocuments()) - before, 1);
  });

  it("si el contenido es string vacío responde 400", async () => {
    await api.post("/api/threads").send({ content: "" }).expect(400);
  });

  it("si author no viene, la publicación se guarda con éxito", async () => {
    const before = await PostModel.countDocuments();
    await api.post("/api/threads").send({ content: "Thread sin autor" }).expect(201);
    assert.equal((await PostModel.countDocuments()) - before, 1);
  });

  it("si author es un nombre prohibido responde 400 y no agrega nada", async () => {
    const before = await PostModel.countDocuments();
    await api.post("/api/threads").send({ content: "Contenido válido", author: "Huevito Rey" }).expect(400);
    assert.equal(await PostModel.countDocuments(), before);
  });

  it("nombre prohibido con otra capitalización (HUEVITO REY) responde 400", async () => {
    const before = await PostModel.countDocuments();
    await api.post("/api/threads").send({ content: "Contenido válido", author: "HUEVITO REY" }).expect(400);
    assert.equal(await PostModel.countDocuments(), before);
  });
});

describe("P4: POST /api/threads/:id (crear comentario)", () => {
  it("con contenido válido responde 201 y agrega exactamente una publicación", async () => {
    const before = await PostModel.countDocuments();
    await api.post(`/api/threads/${thread1Id}`).send({ content: "Comentario válido", author: "Tester" }).expect(201);
    assert.equal((await PostModel.countDocuments()) - before, 1);
  });

  it("si el contenido no viene, responde 400 y no agrega nada", async () => {
    const before = await PostModel.countDocuments();
    await api.post(`/api/threads/${thread1Id}`).send({ author: "Tester" }).expect(400);
    assert.equal(await PostModel.countDocuments(), before);
  });

  it("si el contenido excede 300 caracteres responde 400; con exactamente 300 se acepta", async () => {
    const before = await PostModel.countDocuments();
    await api.post(`/api/threads/${thread1Id}`).send({ content: "a".repeat(301) }).expect(400);
    assert.equal(await PostModel.countDocuments(), before);
    await api.post(`/api/threads/${thread1Id}`).send({ content: "a".repeat(300) }).expect(201);
    assert.equal((await PostModel.countDocuments()) - before, 1);
  });

  it("si el contenido es string vacío responde 400", async () => {
    await api.post(`/api/threads/${thread1Id}`).send({ content: "" }).expect(400);
  });

  it("si author no viene, la publicación se guarda con éxito", async () => {
    const before = await PostModel.countDocuments();
    await api.post(`/api/threads/${thread1Id}`).send({ content: "Comentario sin autor" }).expect(201);
    assert.equal((await PostModel.countDocuments()) - before, 1);
  });

  it("si author es nombre prohibido responde 400 y no agrega nada", async () => {
    const before = await PostModel.countDocuments();
    await api.post(`/api/threads/${thread1Id}`).send({ content: "Contenido válido", author: "Matías Toro" }).expect(400);
    assert.equal(await PostModel.countDocuments(), before);
  });

  it("nombre prohibido con otra capitalización (MEMES ES MAL RAMO) responde 400", async () => {
    const before = await PostModel.countDocuments();
    await api.post(`/api/threads/${thread1Id}`).send({ content: "Contenido válido", author: "MEMES ES MAL RAMO" }).expect(400);
    assert.equal(await PostModel.countDocuments(), before);
  });
});

describe("P5: Comentarios huérfanos", () => {
  it("POST /api/threads/:id con un id de thread válido pero inexistente responde 404", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const before = await PostModel.countDocuments();
    await api.post(`/api/threads/${fakeId}`).send({ content: "Comentario huérfano" }).expect(404);
    assert.equal(await PostModel.countDocuments(), before);
  });

  it("POST /api/threads/:id con parent de otro thread responde 400", async () => {
    const before = await PostModel.countDocuments();
    await api.post(`/api/threads/${thread1Id}`).send({ content: "Parent inválido", parent: commentInThread2Id }).expect(400);
    assert.equal(await PostModel.countDocuments(), before);
  });

  it("POST /api/threads/:id con parent válido del mismo thread responde 201", async () => {
    await api.post(`/api/threads/${thread1Id}`).send({ content: "Respuesta al comentario 1", parent: comment1InThread1Id }).expect(201);
  });
});


describe("P6: PUT /api/posts/:id", () => {
  it("con cuerpo válido responde 200 y el cambio queda guardado", async () => {
    const response = await api.put(`/api/posts/${thread1Id}`).send({ likes: 5 }).expect(200);
    assert.equal(response.body.likes, 5);
    const post = await PostModel.findById(thread1Id);
    assert.equal(post!.likes, 5);
  });

  it("con id válido pero inexistente responde 404", async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    await api.put(`/api/posts/${fakeId}`).send({ likes: 1 }).expect(404);
  });

  it("contenido mayor a 300 caracteres responde 400 y no modifica", async () => {
    const before = await PostModel.findById(thread1Id);
    await api.put(`/api/posts/${thread1Id}`).send({ content: "a".repeat(301) }).expect(400);
    const after = await PostModel.findById(thread1Id);
    assert.equal(after!.content, before!.content);
  });

  it("contenido vacío responde 400 y no modifica", async () => {
    const before = await PostModel.findById(thread1Id);
    await api.put(`/api/posts/${thread1Id}`).send({ content: "" }).expect(400);
    const after = await PostModel.findById(thread1Id);
    assert.equal(after!.content, before!.content);
  });

  it("autor prohibido responde 400 y no modifica", async () => {
    const before = await PostModel.findById(thread1Id);
    await api.put(`/api/posts/${thread1Id}`).send({ author: "Huevito Rey" }).expect(400);
    const after = await PostModel.findById(thread1Id);
    assert.equal(after!.author, before!.author);
  });
});