const express = require('express')
const router = new express.Router()
const auth = require('../middleware/auth')
const Task = require('../models/task')
const multer = require('multer')
const sharp = require('sharp')

router.post('/tasks', auth, async (req, res) => {
    //const task = new Task(req.body)

    const task = new Task({
        ...req.body,
        owner: req.user._id
    })
    try {
        await task.save()
        res.status(201).send(task)
    }
    catch (e) {
        res.status(400).send(e)
    }
})

// /tasks?completed=true
// /tasks?limit=1&skip=1
// /tasks?sortBy=createdAt:desc

router.get('/tasks', auth, async (req, res) => {

    const match = {}
    const sort = {}

    if (req.query.completed) {
        match.completed = req.query.completed === 'true'
    }

    if (req.query.sortBy) {
        const parts = req.query.sortBy.split(':')
        sort[parts[0]] = parts[1] === 'desc' ? -1 : 1
    }

    try {
        await req.user.populate({
            path: 'tasks',
            match,
            options: {
                limit: parseInt(req.query.limit),
                skip: parseInt(req.query.skip),
                sort
            }
        }).execPopulate()

        res.status(200).send(req.user.tasks)
    }
    catch (e) {
        res.status(500).send(e)
    }
})

router.get('/tasks/:id', auth, async (req, res) => {
    const _id = req.params.id
    try {
        // const task = await Task.findById(_id)
        const task = await Task.findOne({ _id, owner: req.user._id })
        if (!task) {
            return res.status(404).send()
        }
        res.status(200).send(task)
    }
    catch (e) {
        if (e.name == "CastError") {
            res.status(404).send("Invalid id")
        }
        res.status(500).send(e)
    }
})

router.patch('/tasks/:id', auth, async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['description', 'completed']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if (!isValidOperation) {
        return res.status(400).send({ error: "Invalid Updates" })
    }

    try {
        const task = await Task.findOne({ _id: req.params.id, owner: req.user._id })

        if (!task) {
            return res.status(404).send()
        }

        updates.forEach(update => task[update] = req.body[update])
        await task.save()

        res.send(task)
    }
    catch (e) {
        res.status(400).send(e)
    }
})

router.delete('/tasks/:id', auth, async (req, res) => {
    try {
        const task = await Task.findOneAndDelete({ _id: req.params.id, owner: req.user._id })

        if (!task) {
            return res.status(404).send()
        }
        res.send(task)
    }
    catch (e) {
        res.status(500).send()
    }
})

const upload = multer({
    limits: {
        files: 2,
        fileSize: 1000000
    },
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png|bmp)$/)) {
            cb(new Error('Please Upload an image file'))
        }
        cb(undefined, true)
    }
})

router.post('/tasks/images/:id', auth, upload.array('uploads'), async (req, res) => {

    try {
        const task = await Task.findById(req.params.id)

        if (!task) {
            res.status(404).send()
        }

        await Promise.all(req.files.map(async (file) => {
            const buffer = await sharp(file.buffer).resize({ height: 250, width: 250 }).png().toBuffer()
            task.images = task.images.concat({ image: buffer })
        }))

        await task.save()
        res.send()
    }
    catch (e) {
        res.status(500).send()
    }

}, (error, req, res, next) => {
    res.status(400).send({ error: error.message })
})

router.get('/tasks/:id/image', auth, async (req, res) => {

    const task = await Task.findOne({ _id: req.params.id })

    res.set('Content-Type', 'image/jpg')
    res.send(task.images[0].image)
})
module.exports = router