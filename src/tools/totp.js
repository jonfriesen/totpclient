import Utils from "./utils.js";
import jsSHA from "./sha.js";

function updateOtp(secret, secretType, otpLength, otpWindow) {
    var key = '';
    if(secretType.toLowerCase() === 'base32') {
        key = Utils.base32tohex(secret);
    }
    if(secretType.toLowerCase() === 'hex') {
        key = secret;
    }
    var epoch = Math.round(new Date().getTime() / 1000.0);
    var time = Utils.leftpad(Utils.dec2hex(Math.floor(epoch / otpWindow)), 16, '0');

    var hmacObj = new jsSHA(time, 'HEX');
    var hmac = hmacObj.getHMAC(key, 'HEX', 'SHA-1', "HEX");
    var offset = Utils.hex2dec(hmac.substring(hmac.length - 1));

    var o  = (Utils.hex2dec(hmac.substr(offset * 2, 8)) & Utils.hex2dec('7fffffff')) + '';
    o = (o).substr(o.length - otpLength, otpLength);

    return o   
}

function getQRURL(secret, otpWindow, otpLength) {
    return 'https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=200x200&chld=M|0&cht=qr&chl=otpauth%3A%2F%2Ftotp%2FUser%3Fsecret%3D' + secret + '%26issuer%3DOTPNinja%26period%3D' + otpWindow + '%26digits%3D' + otpLength;
}

const TOTP = {
    updateOtp: updateOtp,
    getQRURL: getQRURL
}

export default TOTP;