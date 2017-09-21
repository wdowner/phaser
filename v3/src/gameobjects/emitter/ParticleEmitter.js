
var Class = require('../../utils/Class');
var Components = require('../components');
var GameObject = require('../GameObject');
var Render = require('./ParticleEmitterRender');
var Particle = require('./Particle');
var Between = require('../../math/Between');
var StableSort = require('../../utils/array/StableSort');

var ParticleEmitter = new Class({

    Extends: GameObject,

    Mixins: [
        Components.Alpha,
        Components.BlendMode,
        Components.RenderTarget,
        Components.ScrollFactor,
        Components.Texture,
        Components.Transform,
        Components.Visible,
        Render
    ],

    initialize:

    function ParticleEmitter (scene, x, y, texture, frame)
    {

        GameObject.call(this, scene, 'ParticleEmitter');

        this.dead = [];
        this.alive = [];
        this.minSpeed = 0;
        this.maxSpeed = 0;
        this.minScale = 1.0;
        this.maxScale = 1.0;
        this.minAlpha = 1.0;
        this.maxAlpha = 1.0;
        this.minAngle = 0;
        this.maxAngle = 0;
        this.minPartAngle = 0;
        this.maxPartAngle = 0;
        this.gravityX = 0;
        this.gravityY = 0;
        this.life = 1.0;
        this.deathCallback = null;
        this.setTexture(texture, frame);
        this.setPosition(x, y);
    },

    setSpeed: function (min, max)
    {
        this.minSpeed = min;
        this.maxSpeed = max;
    },

    setEmitAngle: function (min, max)
    {
        this.minAngle = min;
        this.maxAngle = max;
    },

    setScale: function (start, end)
    {
        this.minScale = start;
        this.maxScale = end;
    },

    setAlpha: function (start, end)
    {
        this.minAlpha = start;
        this.maxAlpha = end;
    },

    setAngle: function (min, max)
    {
        this.minPartAngle = min;
        this.maxPartAngle = max;
    },

    setGravity: function (x, y)
    {
        this.gravityX = x;
        this.gravityY = y;
    },

    reserve: function (particleCount)
    {
        var dead = this.dead;
        for (var count = 0; count < particleCount; ++count)
        {
            dead.push(new Particle(this.x, this.y));
        }
    },

    getAliveParticleCount: function () 
    {
        return this.alive.length;
    },

    getDeadParticleCount: function ()
    {
        return this.dead.length;
    },

    getParticleCount: function ()
    {
        return this.getAliveParticleCount() + this.getDeadParticleCount();
    },

    onParticleDeath: function (callback) 
    {
        if (typeof callback === 'function') 
            this.deathCallback = callback;
    },

    killAll: function ()
    {
        var dead = this.dead;
        var alive = this.alive;

        while (alive.length > 0)
        {
            dead.push(alive.pop());
        }
    },

    forEachAlive: function (callback, thisArg)
    {
        var alive = this.alive;
        var length = alive.length;

        for (var index = 0; index < length; ++index)
        {
            callback.call(thisArg, alive[index]);
        }
    },

    forEachDead: function (callback, thisArg)
    {
        var dead = this.dead;
        var length = dead.length;

        for (var index = 0; index < length; ++index)
        {
            callback.call(thisArg, dead[index]);
        }
    },

    emitParticle: function()
    {
        var particle = null;
        var rad = Between(this.minAngle, this.maxAngle) * Math.PI / 180;
        var vx = Math.cos(rad) * Between(this.minSpeed, this.maxSpeed);
        var vy = Math.sin(rad) * Between(this.minSpeed, this.maxSpeed);
        
        if (this.dead.length > 0)
        {
            particle = this.dead.pop();
            particle.reset(this.x, this.y);
        }
        else
        {
            particle = new Particle(this.x, this.y);
        }

        particle.rotation = Between(this.minPartAngle, this.maxPartAngle) * Math.PI / 180;
        particle.velocityX = vx;
        particle.velocityY = vy;
        particle.life = Math.max(this.life, Number.MIN_VALUE);
        particle.lifeStep = particle.life;
        particle.start.scale = this.minScale;
        particle.end.scale = this.maxScale;
        particle.scaleX = this.minScale;
        particle.scaleY = this.minScale;
        particle.start.alpha = this.minAlpha;
        particle.end.alpha = this.maxAlpha;
        particle.color = (particle.color & 0x00FFFFFF) | (((this.minAlpha * 0xFF)|0) << 24);
        particle.index = this.alive.length;
                
        this.alive.push(particle);

        return particle;
    },

    preUpdate: function (time, delta)
    {
        var dead = this.dead;
        var particles = this.alive;
        var length = particles.length;
        var emitterStep = (delta / 1000);
        var gravityX = this.gravityX * emitterStep;
        var gravityY = this.gravityY * emitterStep;
        var deathCallback = this.deathCallback;

        /* Simulation */
        for (var index = 0; index < length; ++index)
        {
            var particle = particles[index];

            particle.velocityX += gravityX;
            particle.velocityY += gravityY;
            particle.x += particle.velocityX * emitterStep;
            particle.y += particle.velocityY * emitterStep;
            particle.rotation += particle.angularVelocity * emitterStep;
            particle.normLifeStep = particle.lifeStep / particle.life;

            var norm = 1.0 - particle.normLifeStep;
            var alphaf = (particle.end.alpha - particle.start.alpha) * norm + particle.start.alpha;
            var scale = (particle.end.scale - particle.start.scale) * norm + particle.start.scale;

            particle.scaleX = particle.scaleY = scale;
            particle.color = (particle.color & 0x00FFFFFF) | (((alphaf * 0xFF)|0) << 24);

            if (particle.lifeStep <= 0)
            {
                var last = particles[length - 1];
                particles[length - 1] = particle;
                particles[index] = last;
                index -= 1;
                length -= 1;
                if (deathCallback) deathCallback(particle);
            }
            particle.lifeStep -= emitterStep;

        }

        /* Cleanup */
        var deadLength = particles.length - length;
        if (deadLength > 0)
        {
            dead.push.apply(dead, particles.splice(particles.length - deadLength, deadLength));
            StableSort(particles, function (a, b) { return a.index - b.index; });
        }
    }

});

module.exports = ParticleEmitter;