var { Storage } = require('@google-cloud/storage')

var path = require('path');
var fs = require('fs');

var bucket = new Storage({
    keyFilename: path.join(__dirname, '../alanica-dates-storage-credential.json'),
    projectId: 'alanica-dates-291119'
}).bucket('alanica-dates-291119.appspot.com')


/**
 * Get public URL of a file. The file must have public access
 * @param {string} file_path
 * @param {string} filename
 * @return {Promise<String>}
 */
exports.upload_file = (file_path) => {
    let filename = file_path.split('/')[file_path.split('/').length - 1]
    let file = bucket.file(filename)
    return new Promise((resolve, reject) => {
        fs.createReadStream(file_path)
            .pipe(file.createWriteStream({ resumable: false, gzip: true }))
            .on('error', reject)
            .on('finish', () => {
                file.makePublic()
                    .catch(reject)
                    .then(() => { resolve(`https://storage.googleapis.com/${bucket.name}/${filename}`) });
            })
    })
}
