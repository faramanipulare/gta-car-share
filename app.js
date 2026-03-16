const express = require('express');
const fs = require('fs');
const mongoose = require('mongoose');
const morgan = require('morgan');
const fu = require('express-fileupload');
const path = require('path');
const util = require('util');
const writeFile = util.promisify(fs.writeFile);
const sharp = require('sharp');

//create app
const app = express();
app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: "500ko", parameterLimit: 500 }));
app.use(morgan('dev'));
app.use(fu());

//connect to db
mongoose.connect("")
    .then(() => {
        app.listen(3333, () => {
            console.log("up and running !");
        });
    }).catch(error => console.log(error));

const scheme = new mongoose.Schema({ //make new car schema
    name: String,
    categorie: String,
    actualDate: Date,
}, { collection: 'cars' });

const CarScheme = mongoose.model('CarScheme', scheme);

app.get("", (req, res) => { //redirect to home page
    res.redirect("/home");
});

async function getCategoryLength() {
    let vehicleCategory = {
        commercial: 0, compact: 0, coupe: 0, emergency: 0, military: 0, motorcycle: 0, muscle: 0, offroad: 0,
        openwheel: 0, plane: 0, sedan: 0, service: 0, sport: 0, sportclassic: 0, super: 0, suv: 0
    }
    fs.readdir("views/cars", { withFileTypes: true }, (error, files) => {
        files.forEach(name => {
            async function getToVehicleCategory() {
                await CarScheme.find({ categorie: String(name['name']).split('.')[0] }).then(category => {
                    vehicleCategory[String(name['name']).split('.')[0]] = category.length;
                    console.log(vehicleCategory);
                }).catch(error => console.log(error));
            }
            getToVehicleCategory();
        });
    });
}

//get every single file in cars folder and make it an accessible page
fs.readdir("views/cars", { withFileTypes: true }, (err, files) => {
    if (!err) {
        files.forEach((file) => {
            let fileName = file.name.split(".");
            let name = `${fileName[0]}`;
            app.get(`/${fileName[0]}`, async (req, res) => {
                let carList = [];
                await CarScheme.find({ categorie: `${fileName[0]}` }).sort({ actualDate: -1 }).then(cars => cars.forEach(car => carList.push(car))).catch(error => console.log(error));
                res.render(`cars/${fileName[0]}.ejs`, { title: `${fileName[0]}`.toUpperCase(), cars: carList});
                carList.splice(0);
            });
        });
    }
});

app.get("/home", (req, res) => {
    getCategoryLength();
    res.render('home.ejs', { title: "HOME"}); //home page
});

app.get("/upload", (req, res) => {
    res.render("upload.ejs", { title: "UPLOAD"});
});

app.get("/ads.txt", (req, res) => {
    res.redirect("https://srv.adstxtmanager.com/19390/gtacarshare.com");
});

app.get("/privacy", (req, res) => {
    res.render("privacy.ejs", { title: "PRIVACY"});
});

app.get("/about", (req, res) => {
    res.render("about.ejs", { title: "ABOUT"});
});

async function saveToDB(name, categorie, fileBuffer, fileName, imageBuffer, imageName) {
    let myID;
    await CarScheme.create({
        name: name,
        categorie: categorie,
        actualDate: Date.now(),
    }).then(object => {
            console.log("Successfully saved to db");
            myID = object.id;
    }).catch(error => console.log(error));
    
    await writeFile(`./public/images/${myID}.${imageName}`, imageBuffer, (error) => {
        if (!error) 
            console.log("File saved with success !");
    }).then(() => {
        fs.rename(`${path.join(__dirname)}/public/images/${myID}.${imageName}`, `${path.join(__dirname)}/public/images/${myID}.webp`, (error) => {
            if (error) {
                console.log(error);
            }
            else console.log("everything is ok !");
        })
    });

    await writeFile(`./files/${myID}.${fileName}`, fileBuffer, (error) => {
        if (!error) {
            console.log("File saved with success !");
        }
    }).then(() => console.log("Saved"));
}

app.post("/upload", (req, res) => {
    let ss = req.files;
    let mimetype = ss['vehicleImage'].mimetype;
    const extensions = ["image/png", "image/jpeg", "image/webp", "image/jpg"];
    if (extensions.includes(mimetype)) {
        let ext = mimetype.split("/");
        console.log(ext[1]);
        let inputBuffer = ss['vehicleImage']['data'];
        let outputName = ss['vehicleImage']['name'];
        sharp(inputBuffer).toFile(`${outputName}.webp`, (error, info) => {
            if (!error) {
                console.log(info);
            }
            else {
                throw error;
            }
        });
        saveToDB(req.body['vehicleName'],
            req.body['categorie'],
            ss['vehicleFile']['data'],
            ss['vehicleFile']['name'],
            inputBuffer, outputName);
    }
    res.redirect(`${req.body['categorie']}`);
});

app.get("/download/:id", async (req, res) => {
    let requestID = req.params.id;
    fs.readdir("files", { withFileTypes: true }, (error, files) => {
        if (error) {
            console.log("An error occured while reading the directory !");
        }
        else {
            files.forEach(file => {
                let name = file.name.split(".");
                file = name[1];
                if (name[0] == requestID) {
                    fileName = file.name;
                    fs.rename(`${path.join(__dirname)}/files/${name[0]}.${name[1]}.${name[2]}`, `${path.join(__dirname)}/files/${name[1]}.GTAVV`, (err) => {
                        if (err) console.log(err);
                        else {
                            res.download(`${path.join(__dirname)}/files/${file}.GTAVV`, (err) => {
                                if (err) {
                                    console.log(err);
                                }
                                else {
                                    fs.rename(`${path.join(__dirname)}/files/${file}.GTAVV`, `${path.join(__dirname)}/files/${name[0]}.${name[1]}.${name[2]}`, (error) => {
                                        if (error) console.log(error);
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }
    });
});
