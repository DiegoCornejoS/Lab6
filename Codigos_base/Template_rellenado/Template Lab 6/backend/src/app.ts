import dotenv from "dotenv";
dotenv.config();
import express, { NextFunction, Request, Response } from "express";
import PostModel from "./models/posts";

const app = express();
app.use(express.json());

const requestLogger = (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  console.log("Method:", request.method);
  console.log("Path:  ", request.path);
  console.log("Body:  ", request.body);
  console.log("---");
  next();
};
app.use(requestLogger);

app.get("/api/threads", (request, response) => {
  PostModel.find({ thread: null }).then((posts) => {
    response.json(posts);
  });
});

app.get("/api/threads/:id", (request, response, next) => {
  const id = request.params.id;
  const thread = PostModel.findById(id);
  const posts = PostModel.find({ thread: id });
  Promise.all([thread, posts])
    .then(([thread, posts]) => {
      if (thread) {
        if (thread.thread !== null) {
          return response.status(400).json({ error: "Not a thread" });
        }

        response.json({ thread: thread, comments: posts });
      } else {
        response.status(404).end();
      }
    })
    .catch((error) => next(error));
});

app.post("/api/threads", (request, response, next) => {
  const body = request.body;

  const post = new PostModel({
    content: body.content,
    author: body.author,
    thread: null,
  });

  post.save()
    .then((savedPost) => {
      response.status(201).json(savedPost);
    })
    .catch((error) => next(error));
});

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

app.put("/api/posts/:id", async (request, response, next) => {
  try {
    const body = request.body;
    const id = request.params.id;

    const updatedPost = await PostModel.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (updatedPost) {
      response.json(updatedPost);
    } else {
      response.status(404).end();
    }
  } catch (error) {
    next(error);
  }
});

const unknownEndpoint = (request: Request, response: Response) => {
  response.status(404).json({ error: "unknown endpoint" });
};
app.use(unknownEndpoint);

const errorHandler = (
  error: { name: string; message: string },
  request: Request,
  response: Response,
  next: NextFunction
) => {
  console.error(error.message);

  console.error(error.name);
  if (error.name === "CastError") {
    response.status(400).send({ error: "malformatted id" });
  } else if (error.name === "ValidationError") {
    response.status(400).json({ error: error.message });
  }
  next(error);
};

app.use(errorHandler);
app.use(express.static("dist"));

export default app;
