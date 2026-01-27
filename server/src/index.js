import express, { json } from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { setupStorage } from "./storage.js";
import { setupQueue } from "./queue.js";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Express API with Swagger",
            version: "1.0.0",
            description: "A simple Express API documented with Swagger",
        },
    },
    apis: ["./src/index.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use(cors());
app.use(json());
app.use(express.static(path.join(__dirname, "../client/dist")));


const storage = setupStorage();
const queue = setupQueue(storage);

// app.get("/", (req, res) => {
    //     res.redirect("/swagger");
    // });

    app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /api/items:
 *   get:
 *     summary: Get items with pagination and filtering
 *     description: Retrieve a paginated list of items with optional text filtering
 *     tags:
 *       - Items
 *     parameters:
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of items to skip (pagination offset)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Maximum number of items to return
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           default: ""
 *         description: Filter items by text content
 *     responses:
 *       200:
 *         description: List of items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *                   description: Total number of items matching the filter
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
app.get("/api/items", async (req, res) => {
    try {
        const { offset = 0, limit = 20, filter = "" } = req.query;
        const result = await queue.getItems(
            parseInt(offset),
            parseInt(limit),
            filter,
        );
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/selected:
 *   get:
 *     summary: Get selected items
 *     description: Retrieve paginated list of selected items with optional filtering
 *     tags:
 *       - Selected Items
 *     parameters:
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of items to skip (pagination offset)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Maximum number of items to return
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           default: ""
 *         description: Filter selected items by text content
 *     responses:
 *       200:
 *         description: Selected items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *       500:
 *         description: Internal server error
 */
app.get("/api/selected", async (req, res) => {
    try {
        const { offset = 0, limit = 20, filter = "" } = req.query;
        const result = await queue.getItems(
            parseInt(offset),
            parseInt(limit),
            filter,
            true,
        );
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/selected:
 *   post:
 *     summary: Add item to selected list
 *     description: Add an item to the selected items list by its ID
 *     tags:
 *       - Selected Items
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: string
 *                 description: Unique identifier of the item to select
 *                 example: "item_123"
 *     responses:
 *       200:
 *         description: Item successfully added to selected list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request - missing or invalid ID
 *       500:
 *         description: Internal server error
 */
app.post("/api/selected", async (req, res) => {
    try {
        const { id } = req.body;
        const result = await queue.updateState("add", { id });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/selected/{id}:
 *   delete:
 *     summary: Remove item from selected list
 *     description: Remove an item from the selected items list by its ID
 *     tags:
 *       - Selected Items
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique identifier of the item to remove
 *     responses:
 *       200:
 *         description: Item successfully removed from selected list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Item not found in selected list
 *       500:
 *         description: Internal server error
 */
app.delete("/api/selected/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await queue.updateState("remove", { id });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/selected/order:
 *   put:
 *     summary: Reorder selected items
 *     description: Update the order of items in the selected list
 *     tags:
 *       - Selected Items
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - order
 *             properties:
 *               order:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of item IDs in the desired order
 *                 example: ["item_3", "item_1", "item_2"]
 *     responses:
 *       200:
 *         description: Selected items reordered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid order array
 *       500:
 *         description: Internal server error
 */
app.put("/api/selected/order", async (req, res) => {
    try {
        const { order } = req.body;
        const result = await queue.updateState("reorder", { order });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /api/items:
 *   post:
 *     summary: Add new item request
 *     description: Submit a request to add a new item to the system
 *     tags:
 *       - Items
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - text
 *             properties:
 *               id:
 *                 type: string
 *                 description: Unique identifier for the new item
 *                 example: "new_item_123"
 *               text:
 *                 type: string
 *                 description: Text content of the item
 *                 example: "Sample item description"
 *     responses:
 *       200:
 *         description: Item add request submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 requestId:
 *                   type: string
 *                 status:
 *                   type: string
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Internal server error
 */
app.post("/api/items", async (req, res) => {
    try {
        const { id, text } = req.body;
        const result = await queue.addAddRequest(id, text);
        if (!result.success) return res.status(400).json(result);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});



/**
 * @swagger
 * tags:
 *   - name: Items
 *     description: General item management operations
 *   - name: Selected Items
 *     description: Operations for managing selected items
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: Error message
 *     Success:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 */

app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});


app.listen(PORT, (e) => {
    if (e) console.error(`Ошибка: ${e.message}`);
    console.log(`Сервер запущен на http://localhost:${PORT}`);
    console.log(`Swagger доступен на http://localhost:${PORT}/swagger`);
    console.log("Данные хранятся в памяти приложения");
});
