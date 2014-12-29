/* particleEngine main
*
* Notes, in the form of a todo checklist
*   todo add sprite / shape support
*
* */

var document = root.document || {};

var particles = function(context) {
    if(typeof context === 'undefined'  || !(context instanceof root.CanvasRenderingContext2D)){
        throw new Error('particles must be defined with a canvas context');
    }

    //internal context
    var _context = context;
    /*
     An extend function, makes deep copies
     */
    function extend(dest, sources){
        var args = Array.prototype.slice.call(arguments);
        for(var i = 1; i < args.length; i++){
            for(var key in args[i]){
                if(args[i].hasOwnProperty(key)){
                    if(typeof args[i][key] === 'object' && (args[i][key] instanceof Array) === false){
                        dest[key] = dest[key] || {};
                        extend(dest[key], args[i][key]);
                    }else{
                        dest[key] = args[i][key];
                    }
                }
            }
        }
        return dest;
    }
    //turn hex to rgb, this is necessary for DAT gui, there's some kind of bug that causes it to assign a color to a hex value sometimes
    function hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    //A min / max random generator
    function minMax(min, max){
        return (min) + (Math.random() * (max - min));
    }
    function particleVariation(particle){
        particle.direction = minMax(particle.direction, particle.spread);

        particle.speed.x += Math.random()*particle.speed.spread;
        particle.speed.y += Math.random()*particle.speed.spread;

        particle.size.x += Math.random()*particle.size.spread;
        particle.size.y += Math.random()*particle.size.spread;

        //for a dat gui bug
        if(typeof particle.color === 'string'){
            var colors = hexToRgb(particle.color);
            particle.color = [colors.r, colors.g, colors.b];
        }
        particle.color = particle.color.map(Math.floor);

        return particle;
    }
    /*

     Pre-defined particle Types

     */
    var particleTypes = {

        flame :
        {"weight":0,"direction":1.8016922886691076,"spread":1.1780295733605703,"position":{"x":0,"y":0},"speed":{"x":0.6,"y":0.6,"spread":1.6},"gravity":0,"gravityCount":0,"color":[250,117.64705882352948,0],"size":{"height":0,"width":0,"spread":3.3672395650648896,"x":2.1,"y":2},"sprite":false,"shape":false,"alpha":1,"decay":73},
        water :
            {"weight":0,"direction":2.286763289464637,"spread":2.286763289464637,"position":{"x":0,"y":0},"speed":{"x":2.4,"y":2.8,"spread":2},"gravity":9,"gravityCount":0,"color":[43.627450980392155,138.32468281430226,222.5],"size":{"height":0,"width":0,"spread":3.4439461883408073,"x":8.035874439461884,"y":2.244826376709926},"sprite":false,"shape":false,"alpha":1,"decay":388},
        smoke :
            {"weight":0,"direction":1.1780295733605703,"spread":1.8016922886691076,"position":{"x":0,"y":0},"speed":{"x":0.79,"y":0.6,"spread":0.4},"gravity":0,"gravityCount":0,"color":[23.455882352941163,25.596885813148777,27.499999999999986],"size":{"height":0,"width":0,"spread":3.3672395650648896,"x":2.244826376709926,"y":1.122413188354963},"sprite":false,"shape":false,"alpha":0.24263312079958643,"decay":295},
        explode:
            {"weight":0,"direction":0,"spread":6.283185307179586,"position":{"x":0,"y":0},"speed":{"x":5,"y":3,"spread":3},"gravity":1,"gravityCount":0,"color":[255,65,65],"size":{"x":4,"y":1,"spread":5},"sprite":false,"shape":false,"alpha":1,"decay":228},
        snow:
            {"weight":0,"direction":3.949863863620736,"spread":5.474372723263827,"position":{"x":0,"y":0},"speed":{"x":0.6,"y":0.6,"spread":0.4},"gravity":0,"gravityCount":0,"color":"#ffffff","size":{"height":0,"width":0,"spread":2,"x":2.5,"y":2},"sprite":false,"shape":false,"alpha":1,"decay":449},

    };

    /*

     Describes properties of a particle, a private variable. Both the emitter and collection functions interact with it.

     */
    var particle = {
        direction : 0,
        spread: 0,
        position : {
            x: 0,
            y: 0
        },
        speed: {
            x: 0,
            y: 0,
            spread: 0
        },
        gravity : 0,
        gravityCount:0,
        color : [],
        size: {
            height: 0,
            width: 0,
            spread: 0
        },
        sprite: false, //not implemented
        shape: false,  //not implemented
        alpha: 0,
        decay: 0
    };

    var collectionDefaults = {
        max: 100 ,
        density: 1,
        cycleOnce: false,
        cycleCount: 0,
        finished : false,
        stopped: false
    };

    /*

     A collection holds an array of particles and contains functions to preform actions on them

     */
    var collection = function(emitter, args){
        if(typeof emitter === 'undefined'){
            throw new Error("Emitter needs to be passed to a collection");
        }

        var particleArr = [],
            properties = extend({}, collectionDefaults, args);

        return {
            properties : properties,
            emitter : extend({},emitter),
            exportParticle : function(){
                return root.JSON.stringify(this.emitter.particle);
            },
            cycle : function(){
                var i = 0;
                if(this.numParticles()<this.properties.max && this.properties.finished === false){
                    while(i++ < this.properties.density ){
                        if(this.properties.cycleOnce){
                            this.properties.cycleCount++;
                        }
                        this.addParticle();
                        if(this.properties.cycleCount >= this.properties.max && this.properties.cycleOnce){
                            this.properties.finished = true;
                        }
                    }
                }
            },
            reset : function(){
                particleArr = [];
                _context.clearRect(0,0,_context.canvas.width, _context.canvas.height);
                this.properties.finished = false;
                this.properties.cycleCount = 0;
            },
            addParticle : function(){
                //only add more particles if the collection isn't stopped
                if(this.properties.stopped === false){
                    var _particle = extend({}, particle, emitter.particle);
                    //this is where we give particles the variation through all of the various spreads
                    _particle = particleVariation(_particle);
                    //place particle based on emitter height / width
                     var org = {
                            x: minMax(emitter.properties.origin.x, emitter.properties.origin.x + emitter.properties.width),
                            y: minMax(emitter.properties.origin.y, emitter.properties.origin.y + emitter.properties.height)
                        };
                    extend(_particle.position, org);

                    particleArr.push(_particle);
                }
            },
            numParticles : function(){
                return particleArr.length;
            },
            draw : function(){
                this.cycle();
                // http://jsperf.com/for-loops22/2
                    for(var i = 0, j = particleArr.length, particle; particle = particleArr[i]; i++){//jshint ignore:line
                        //move particle
                        particle.position.x += (particle.speed.x) * Math.cos(particle.direction);
                        particle.position.y -= (particle.speed.y) * Math.sin(particle.direction);
                        //gravity
                        if(particle.gravityCount < particle.gravity){
                            particle.gravityCount += particle.gravity*0.025;
                        }
                        particle.position.y += particle.gravityCount;
                        //get particle distance from origin
                        var diffX = particle.position.x - (emitter.properties.origin.x + emitter.properties.width),
                            diffY = particle.position.y - (emitter.properties.origin.y + emitter.properties.height),
                            distance = Math.sqrt((diffX*diffX)+(diffY*diffY));
                        //decay particle
                        var trueAlpha = particle.alpha - (distance / particle.decay);

                        if(trueAlpha <= 0){
                            particleArr.splice(i, 1);
                        }

                        //draw particle
                        //todo: shape, sprite

                        _context.fillStyle = "rgba("+particle.color.join()+","+trueAlpha +")";

                        _context.beginPath();
                        _context.arc(
                            particle.position.x,
                            particle.position.y,
                            (particle.size.x * particle.size.y /2),
                            0,
                                Math.PI*2,
                            true
                        );
                        _context.closePath();
                        _context.fill();
                    }
            }
        };
    };

    /*

     An emitter describes the behavior of individual particles

     */
    var emitter = function(_particle, properties){
        var props = {
            origin : {
                x: 0,
                y: 0
            },
            height : 1,
            width:1
        }, type, _p;
        //
        extend({}, props, properties);

        var setParticle = function(p){
            if(typeof p === 'string'){
                //user supplied a string, look for a pre-defined particle
                type = particleTypes[p];
                if(typeof particleTypes[p] === 'undefined'){
                    throw new Error(p+" Does not exist");
                }
            }
            else if(typeof p === 'undefined'){
                //pointless to instantiate further, the default particle object has no usable properties
                throw new Error("Undefined particle type");
            }
            else{
                //For now we'll assume that the user supplied an object, todo: more strict type checking
                //we extend the user supplied object into the particle object to at least ensure that all the defaults are there todo: validate this particle
                //we extend this object into a new object to so that the defaults aren't altered and we're dealing with a fresh object and not a reference.
                type = p;
            }
            _p = extend({}, particle, type);
        };
        setParticle(_particle);


        return {
            properties : props,
            particle: _p,
            setOrigin: function(x,y){
                this.properties.origin.x = x;
                this.properties.origin.y = y;
            },
            setParticle : function(p){
                setParticle(p);
                extend(this.particle,_p);
            }
        };
    };

    /*
     Limit access to the inside functions
     */
    return {
        collection : collection,
        emitter : emitter,
        updateContext : function(context){
            _context = context;
        }
    };
};

// Version.
particles.VERSION = '0.2.0';

// Export to the root, which is probably `window`.
root.particles = particles;