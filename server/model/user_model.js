const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const UserSchema = new Schema({
    username: {type: String, required: true, unique: true},
    email: {type: String, required: true},
    authyId: {type: String},
    phone_number: {type: Number ,required: true},
    country_code: {type: Number, default: +977},
    hashed_password: String
});

mongoose.model('User', UserSchema);
