var express = require('express'),
  router = express.Router(),
  mongoose = require('mongoose'),
  Route = mongoose.model('Route'),
  Fleet = mongoose.model('Fleet')

module.exports = function (app) {
  app.use('/route', router);
};

router.get('/', function (req, res, next) {
  res.send('Hola')
});
router.get('/new',(req,res)=>{
    Fleet.find({}).then(fleets=>{
        res.render('routes/new',{fleets:fleets})
    })
})
router.get('/edit/:id',(req,res)=>{
    Fleet.find({}).then(fleets=>{
        res.render('routes/new',{fleets:fleets})
    })
})
router.post('/',(req,res)=>{
    let RouteParams = req.body;
    let route = new Route(RouteParams);
    route.save((err,route)=>{
        if(!err)
            res.send(route)
        else
            res.status(500).send(err)
    })
})
