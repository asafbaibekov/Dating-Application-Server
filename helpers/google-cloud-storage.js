var { Storage } = require('@google-cloud/storage')
var { v4: uuidv4 } = require('uuid')

var path = require('path');
var fs = require('fs');

const storage = new Storage({
    keyFilename: path.join(__dirname, '../alanica-dates-storage-credential.json'),
    projectId: 'alanica-dates-291119'
})
var messages_bucket = storage.bucket('alanica-dates-291119.appspot.com')


/**
 * Get signed URL of a file.
 * @param {string} file_path
 * @return {Promise<String>}
 */
exports.upload_file = (file_path) => {
    let file = messages_bucket.file(uuidv4())
    return new Promise((resolve, reject) => {
        fs.createReadStream(file_path)
            .pipe(file.createWriteStream({ resumable: false, gzip: true }))
            .on('error', reject)
            .on('finish', () => {
                file.getSignedUrl({ action: 'read', expires: Date.now() + 60 * 60 * 24 * 7 * 1000 })
                    .then((urls) => {
                        resolve({
                            name: file.name,
                            bucket: file.bucket.name,
                            url: urls[0]
            })
    })
                    .catch(reject);
            })
    })
}
