const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();
app.use(cors());
app.set('trust proxy', true);
const port = 3000;
const savedTrackDataDir = path.join(__dirname, 'saved-track-data');

// Middleware to parse JSON bodies
app.use(express.json());


function createDirectoryIfNotExists(directoryPath) {
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
        console.log(`Directory created: ${directoryPath}`);
    } else {
        console.log(`Directory already exists: ${directoryPath}`);
    }
    return directoryPath;
}


function sanitizeString(inputString) {
    const sanitizedString = inputString.replace(/[^\w\s:/-]/gi, '')
                                        .replace(/[\s:/-]+/g, '_')
                                        .toLowerCase();
    return sanitizedString;
}


// POST endpoint to receive JSON and save it to a file
app.post('/save-track', (req, res) => {
    const data = req.body;
    const artist_name = (data.artist);
    const title_name = (data.title);

    const date = new Date();
    const mdy = date.toLocaleDateString();
    const time = date.toLocaleTimeString();

    data.date_time = `${mdy} ${time}`;

    const cleaned_name = sanitizeString(`${artist_name}-${title_name}-${mdy}-${time}`);
    const filename = `${cleaned_name}.json`;

    let d = createDirectoryIfNotExists(path.join(process.cwd(), 'saved-track-data'))

    console.log('/save-track', d);


    // Write JSON data to file
    fs.writeFile(`${d}/${filename}`, JSON.stringify(data, null, 2), (err) => {
        if (err) {
            console.error('Failed to write to file', err);
            return res.status(500).send('Unable to save data');
        }
        res.send('Data saved successfully');
    });
});



// Endpoint to list JSON files and their URLs
app.get('/track-data-list', (req, res) => {
    // Read the contents of the directory
    fs.readdir(savedTrackDataDir, (err, files) => {
        if (err) {
            console.error('Error reading directory:', err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }

        // Filter out non-JSON files
        const jsonFiles = files.filter(file => file.endsWith('.json'));

        // Construct list of file URLs
        const fileURLs = jsonFiles.map(file => ({
            fileName: file,
            fileURL: `${req.protocol}://${req.get('host')}/saved-track-data/${file}`
        }));

        // Send the list as JSON response
        res.json(fileURLs);
    });
});

app.get('/saved-track-data/:filename', (req, res) => {
    const fileName = req.params.filename;
    const filePath = path.join(savedTrackDataDir, fileName);

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'File not found' });
        return;
    }

    // Set the appropriate content type for JSON
    res.setHeader('Content-Type', 'application/json');

    // Send the file
    res.sendFile(filePath);
});

// Endpoint to delete a JSON file
app.delete('/saved-track-data/:filename', (req, res) => {
    const fileName = req.params.filename;
    const filePath = path.join(savedTrackDataDir, fileName);

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'File not found' });
        return;
    }

    // Delete the file
    fs.unlink(filePath, (err) => {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to delete file' });
            return;
        }
        res.status(200).json({ message: 'File deleted successfully' });
    });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
