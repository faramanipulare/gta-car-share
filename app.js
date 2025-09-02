const express = require('express');
const fs = require('fs');
const mongoose = require('mongoose');
const morgan = require('morgan');
const fu = require('express-fileupload');
const path = require('path');
const util = require('util');

//create app
const app = express();
app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: "500ko", parameterLimit: 500 }));
app.use(morgan('dev'));
app.use(fu());

//connect to db
mongoose.connect("mongodb+srv://iyafuuhak:8RSoxoyvspOt5OC2@cluster0.dno3x3p.mongodb.net/modded_vehicles?retryWrites=true&w=majority")
    .then(() => {
        app.listen(3333, () => {
            console.log("up and running !");
        });
    }).catch(error => console.log(error));

const scheme = new mongoose.Schema({ //make new car schema
    name: String,
    categorie: String,
}, { collection: 'cars' });

const CarScheme = mongoose.model('CarScheme', scheme);

app.get("/", (req, res) => { //redirect to "super" categorie
    res.redirect("/super");
});

//get every single file in cars folder and make it an accessible page
fs.readdir("views/cars", { withFileTypes: true }, (err, files) => {
    if (!err) {
        files.forEach((file) => {
            let fileName = file.name.split(".");
            app.get(`/${fileName[0]}`, async (req, res) => {
                let carList = [];
                await CarScheme.find({ categorie: `${fileName[0]}` }).then(cars => cars.forEach(car => carList.push(car))).catch(error => console.log(error));
                res.render(`cars/${fileName[0]}.ejs`, { title: `${fileName[0]}`, cars: carList });
                carList.splice(0);
            });
        });
    }
});

app.get("/upload", (req, res) => {
    res.render("upload.ejs", { title: "upload" });
});

const writeFile = util.promisify(fs.writeFile);

const save = async (name, categorie, fileBuffer, fileName, imageBuffer, imageName, extension) => {
    let myID;
    await CarScheme.create({
        name: name,
        categorie: categorie,
        file: {
            data: fileBuffer,
            name: fileName,
        },
    })
        .then(object => {
            console.log("Successfully saved to db");
            myID = object.id;
        })
        .catch(error => console.log(error));
    await writeFile(`./public/images/${myID}.${imageName}`, imageBuffer, (error) => {
        if (!error) {
            console.log("File saved with success !");
        }
    }).then(() => {
        fs.rename(`${path.join(__dirname)}/public/images/${myID}.${imageName}`, `${path.join(__dirname)}/public/images/${myID}.${extension}`, (error) => {
            if (error) {
                console.log(error);
            }
            else {
                console.log("everything is ok !");
            }
        })
    });
}

app.post("/upload", (req, res) => {
    let ss = req.files;

    let mimetype = ss['vehicleImage'].mimetype;
    const extensions = ["image/png", "image/jpeg", "image/webp", "image/jpg"];
    if (extensions.includes(mimetype)) {
        let ext = mimetype.split("/");
        console.log(ext[1]);
        save(req.body['vehicleName'], req.body['categorie'], ss['vehicleFile']['data'], ss['vehicleFile']['name'], ss['vehicleImage']['data'], ss['vehicleImage']['name'], ext[1]);
    }

    // console.log(ss['vehicleImage']['data']);

    // let types = ['image/jpeg', 'image/webp', 'image/png', 'image/jpg'];
    // if (types.includes(ss['vehicleImage']['name'].mimetype)) {
    //     
    //     //save(req.body['vehicleName'], req.body['categorie'], fileBuffer, fileName, imageBuffer, imageName);
    // }

    res.redirect('/');
});