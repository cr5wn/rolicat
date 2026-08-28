import express from "express"
import cors from "cors"

const app = express()
const port = process.env.PORT || 3000
const base = "https://api.rolimons.com"
const cache = new Map()

app.use(cors())

app.get("/", (req, res) => {
    res.json({
        name: "rolicat",
        status: "online"
    })
})

app.get("/health", (req, res) => {
    res.json({
        status: "ok"
    })
})

app.use(async (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
        return res.status(405).json({
            error: "method not allowed"
        })
    }

    try {
        const key = req.originalUrl
        const old = cache.get(key)

        if (old && old.expires > Date.now()) {
            res.status(old.status)
            res.set("content-type", old.type)

            if (req.method === "HEAD") {
                return res.end()
            }

            return res.send(old.body)
        }

        const url = new URL(req.originalUrl, base)

        const response = await fetch(url, {
            method: req.method,
            headers: {
                accept: req.get("accept") || "application/json",
                "user-agent": "rolicat"
            }
        })

        const body = Buffer.from(
            await response.arrayBuffer()
        )

        const type =
            response.headers.get("content-type") ||
            "application/json"

        if (response.ok && req.method === "GET") {
            cache.set(key, {
                status: response.status,
                type,
                body,
                expires: Date.now() + 30000
            })
        }

        res.status(response.status)
        res.set("content-type", type)

        if (req.method === "HEAD") {
            return res.end()
        }

        return res.send(body)
    } catch {
        return res.status(502).json({
            error: "upstream failed"
        })
    }
})

app.listen(port, "0.0.0.0", () => {
    console.log(`rolicat running on ${port}`)
})
