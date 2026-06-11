var express = require('express')
var multer = require('multer')
const { join } = require('path')
const fs = require('fs')
var app = express()

// configure the on-disk storage to store the original file name
var storage = multer.diskStorage({
	destination: 'public/',
	filename: function (req, file, cb) {
		cb(null, Date.now() + file.originalname)
	},
})

// use mutler as a middleware
var middleware = multer({ storage: storage })

app.use(express.static('static'))

// accept any files to the upload route
app.post('/upload', middleware.single('file'), function (req, res, next) {
	console.log('file:', req.file)
	console.log('body:', req.body)
	res.status(200).send('ok')
	const folder = Date.now() + '-'

	fs.mkdirSync(join(__dirname, 'public',folder))
	fs.renameSync(join(__dirname, 'public',req.file.filename),join(__dirname, 'public',folder,req.file.filename))
	const spawn = require('child_process').spawn
	const pythonProcess = spawn('python', [
		'C:\\Users\\aicteadmin\\Documents\\meta\\translate_new\\data\\run.py',
		'--file',
		req.file.filename,
		'--input_dir',
		join(__dirname, 'public',folder),
	])
	console.log(['C:\\Users\\aicteadmin\\Documents\\meta\\translate_new\\data\\run.py', '--file', req.file.filename, '--input_dir', join(__dirname, 'public')])
	pythonProcess.stdout.on('data', (data) => {
		console.log(data.toString())
	})
	pythonProcess.stderr.on('data', (data) => {
		console.log(data.toString())
	})
})

// test to make sure the server is running
app.get('/', function (req, res, next) {
	res.status(200).send('Hello World')
})

app.listen(8080, function () {
	console.log('app is running on port 8080')
})
