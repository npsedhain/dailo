if(process.env.NODE_ENV === 'production'){
  module.exports = {mongoURI :'mongodb://anup:production123@ds151863.mlab.com:51863/dailo-prod'}
} else {
  module.exports = {mongoURI :'mongodb://localhost:27017/sendsms'}
}
