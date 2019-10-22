const path = require("path");

const Koa = require("koa");
const Router = require("koa-router");
const Pug = require("koa-pug");
const koaBody = require("koa-body");
const mongoose = require("mongoose");
const shortid = require("shortid");
const send = require("koa-send");

const app = new Koa();
const router = new Router();
const port = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URL || "mongodb://localhost/imghost", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const imageSchema = new mongoose.Schema({
  galleryId: String,
  adminId: String,
  filename: String
});

const Image = mongoose.model("Image", imageSchema);

new Pug({
  viewPath: path.resolve(__dirname, "./views"),
  app
});

router.get("/", async ctx => await ctx.render("home"));

router.post(
  "/new-gallery",
  koaBody({
    multipart: true,
    formidable: { uploadDir: path.resolve(__dirname, "../images") }
  }),
  ctx => {
    const galleryId = shortid.generate();
    const adminId = shortid.generate();
    const images =
      typeof ctx.request.files.images.length === "number"
        ? ctx.request.files.images
        : [ctx.request.files.images];

    images.forEach(async image => {
      const newImage = new Image({
        galleryId,
        adminId,
        filename: path.basename(image.path)
      });

      await newImage.save();
    });

    ctx.redirect(`/gallery/${galleryId}?adminId=${adminId}`);
  }
);

router.get("/gallery/:galleryId", async ctx => {
  const images = await Image.find(
    { galleryId: ctx.params.galleryId },
    "filename -_id"
  );

  await ctx.render("gallery", { images });
});

router.get("/image/:filename", async ctx => {
  await send(ctx, "images/" + ctx.params.filename);
});

app.use(router.routes());
app.use(router.allowedMethods());
app.listen(port);

process.stdout.write(`imghost server listening on port ${port}.\n`);
