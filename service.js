const rp = require("request-promise");
const restify = require("restify");
const $ = require("cheerio");

const server = restify.createServer();

server.listen(9999, "0.0.0.0", function() {
    console.log("Listening on 9999...");
});

async function fixIP(ip) {
    let result = ip;
    if (ip == "127.0.0.1") {
        await rp("https://api.ipify.org/").then(function(src) {
            result = src;
        });
    }

    return result;
}

async function getCityFromIP(ip) {
    let result;
    await rp("https://ipinfo.io/" + ip + "/region").then(function(city) {
        result = fixTurkishChars(city);
    });

    return result;
}

async function getIstNoFromCity(city) {
    let result;
    await rp("https://servis.mgm.gov.tr/api/merkezler?il=" + city).then(
        function(mgm) {
            let json = JSON.parse(mgm);
            result = json[0].gunlukTahminIstNo;
        }
    );

    return result;
}

async function getWeatherInfo(istNo) {
    let result;
    await rp(
        "https://servis.mgm.gov.tr/api/sondurumlar?merkezid=" + istNo
    ).then(function(info) {
        result = JSON.parse(info)[0];
    });

    return result;
}

async function getTime(city) {
    let result;
    await rp("https://time.is/" + city).then(function(time) {
        result = $("#twd", time).text();
    });
    return result;
}

function fixTurkishChars(text) {
    var result = text;

    result = result.toUpperCase();
    result = result.replace("İ", "I");
    result = result.replace("Ğ", "G");
    result = result.replace("Ü", "U");
    result = result.replace("Ş", "S");
    result = result.replace("Ö", "O");
    result = result.replace("Ç", "C");

    return result;
}

server.get("/api/weather/:type", async function respond(req, res, next) {
    let ip = await fixIP(req.connection.remoteAddress);
    let city = await getCityFromIP(ip);
    let istNo = await getIstNoFromCity(city);
    let weatherJSON = await getWeatherInfo(istNo);
    let time = await getTime(city);

    console.log(ip);
    console.log(city);
    console.log(istNo);
    console.log(weatherJSON);
    console.log(time);

    let result = {
        temperature: weatherJSON.sicaklik,
        humidity: weatherJSON.nem,
        status: weatherJSON.hadiseKodu,
        wind: weatherJSON.ruzgarHiz,
        time: time
    };

    if (req.params.type === "all") {
        res.contentType = "application/json";
        res.send(result);
    } else if (result.hasOwnProperty(req.params.type)) {
        res.contentType = "text/plain";
        res.send(result[req.params.type].toString());
    } else {
        res.contentType = "text/plain";
        res.send("ERROR");
    }
});
