var { Storage } = require('@google-cloud/storage')
var { v4: uuidv4 } = require('uuid')

var path = require('path');
var fs = require('fs');

const storage = new Storage({
    keyFilename: path.join(__dirname, '../alanica-dates-storage-credential.json'),
    projectId: 'alanica-dates-291119'
})
var messages_bucket = storage.bucket('alanica-dates-291119.appspot.com')
var profile_pictures_bucket = storage.bucket('alanica-dates-profile-pictures')


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

/**
 * Get signed URL to upload the file to. The file must have public access
 * @param {string} filename
 * @return {Promise<String>}
 */
exports.upload_profile_picture = (file_path) => {
    let file = profile_pictures_bucket.file(uuidv4())
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

/**
 * deleting profile picture from it's bucket by givig a file name
 * @param {string} file_name
 * @return {Promise<String>}
 */
exports.delete_profile_picture = (file_name) => {
    return profile_pictures_bucket.file(file_name).delete()
}