const canvas = document.querySelector(".ctx");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth - 6;
canvas.height = window.innerHeight - 6;

ctx.textAlign = "center";
ctx.fillStyle = "hsl(0, 0%, 80%)";

var c = null, // Главный мяч/Main ball
  stick1 = null,
  stick2 = null,
  RAF_ID = null; // Айдишник RAF/RAF ID *RAF - Request Animation Frame

// Промпт/Prompt
const max = window.prompt("До скольки играем?\nPlay first to?", "5");

/* ⚠️ */
// const max = 20;
/* ⚠️ */

const intervals = [];
const timeouts = [];

// Для отслеживания ввода/For input tracking
const sticks = [];

const CONFIG = {
  debug: true,
  mouseX: canvas.width / 2,
  mouseY: canvas.height / 2,
  stick: {
    width: 36,
    height: 150,
    gap: 4,
    speed: 2,
    color: "",
  },
  ball: {
    radius: 10,
    minSpeed: 2.5,
    maxSpeed: 8,
    minAngle: 3,
    maxAngle: 10,
    color: "",
  },
  game: {
    maxScore: Number(max) > 0 && Number(max) < 1000 ? max : 5,
    winner: null,
    isOver: false,
  },
  // Диапазон и интервал появления & исчезновения объектов (в секундах)/The range and interval of appearance & disappearance of objects (in seconds)
  eventTimeRanges: {
    min: 10,
    max: 20,
    appearanceInterval: 10,
    disappearanceInterval: 40,
  },
  specialObjects: {
    /* Global settings for all special Objects */
    x: canvas.width / 2,
    y: canvas.height / 2,
    dy: 0.2, // vertical speed
    radius: 50,
    maxDistance_X: 170,
    maxDistance_Y: 50,
    fillStyle: "hsla(0, 0%, 0%, 0)", // Должен быть прозрачным чтобы случайно не перекрыть контент/Shoud be transparent so as not to accidantally overlap the content
    strokeStyle: "hsl(0, 0%, 80%)",
    effectEndTime: 15, // in seconds
    /*  */
    // Началось ли событие - появления объектов/Whether the event started - the appearance of objects
    eventStarted: false,
    eventsArray: [],
    objectsToBeCreated: [],
    classesArray: [],
    objects: {
      LotOfBalls: {
        ballsRadius: 10,
        ballsAmount: 6,
        ballsFillStyle: null,
        ballsStrokeStyle: null,
      },
      BigOrSmallBall: {
        maxRadius: 20,
        minRadius: 6,
      },
      LongOrShortStick: {
        maxHeight: 300,
        minHeight: 70,
        reducedWidth: 18,
      },
    },
  },
};

class SpecialObject {
  constructor() {
    this.x =
      CONFIG.specialObjects.x +
      Math.random() *
        CONFIG.specialObjects.maxDistance_X *
        generateRandomSign();
    this.y =
      CONFIG.specialObjects.y +
      Math.random() *
        CONFIG.specialObjects.maxDistance_Y *
        generateRandomSign();
    this.dy = CONFIG.specialObjects.dy;
    this.radius = CONFIG.specialObjects.radius;
    this.fillStyle = CONFIG.specialObjects.fillStyle;
    this.strokeStyle = CONFIG.specialObjects.strokeStyle;
    this.isCollided_Y = false;
    this.objectCollidedWithTheMainBall = false;
    this.shouldDisappear = false;
    this.objectAppearanceTime = Date.now();
    this.objectDisappearanceTime = CONFIG.eventTimeRanges.disappearanceInterval;
    this.startOfPauseTime = 0;
    this.endOfPauseTime = 0;
    this.baseEffectEndTime = CONFIG.specialObjects.effectEndTime;
    this.effectStartedTime = null;
    this.isEffectStarted = false;
    this.isEffectOver = false;
    this.lastHittingStick = null;
  }

  drawObject() {
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.fillStyle = this.fillStyle;
    ctx.strokeStyle = this.strokeStyle;
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    ctx.stroke();
    ctx.fill();
    ctx.closePath();
  }

  movementAndCollisionCheck(mainBall) {
    // Движение круга по вертикали/Circle vertical movement
    if (
      // border bottom collision
      this.y + this.radius > canvas.height - CONFIG.stick.gap ||
      // border top collision
      this.y - this.radius < CONFIG.stick.gap
    ) {
      if (!this.isCollided_Y) {
        this.dy = -this.dy;
      }
      this.isCollided_Y = true;
    } else {
      this.isCollided_Y = false;
    }

    // Коллизия с основным мячом/Collision with main ball
    if (
      Math.sqrt(
        Math.pow(this.x - mainBall.x, 2) + Math.pow(this.y - mainBall.y, 2)
      ) <
      this.radius + mainBall.radius
    ) {
      this.objectCollidedWithTheMainBall = true;
    }
  }

  checkDisappearanceTime() {
    if (
      Math.floor(
        (Date.now() -
          this.objectAppearanceTime -
          (this.endOfPauseTime - this.startOfPauseTime)) /
          1000
      ) >= this.objectDisappearanceTime &&
      !this.objectCollidedWithTheMainBall
    )
      return true;
    else return false;
  }

  checkDisappearanceTimeNoEffect() {
    if (
      Math.floor(
        (Date.now() -
          this.objectAppearanceTime -
          (this.endOfPauseTime - this.startOfPauseTime)) /
          1000
      ) >=
      this.objectDisappearanceTime + this.objectDisappearanceTime / 2
    )
      return true;
    else return false;
  }

  effectBegins(Ball_or_Stick, ClassName, _this) {
    if (!this.isEffectStarted) {
      this.effectStartedTime = Date.now();
      this.isEffectStarted = true;
      if (!Ball_or_Stick.effects.includes(ClassName)) {
        Ball_or_Stick.effects.push(ClassName);
      }
      // Для исключения влияний прошлых копий/To exclude the influence of past copies
      let arrayOfInstanses = [];
      for (let i = 0; i < CONFIG.specialObjects.eventsArray.length; i++) {
        if (
          CONFIG.specialObjects.eventsArray[i] instanceof ClassName &&
          CONFIG.specialObjects.eventsArray[i].objectCollidedWithTheMainBall
        ) {
          arrayOfInstanses.push(CONFIG.specialObjects.eventsArray[i]);
        }
      }
      if (arrayOfInstanses.length > 1) {
        if (Ball_or_Stick instanceof Circle) {
          for (let i = 0; i < arrayOfInstanses.length; i++) {
            if (
              arrayOfInstanses[i] !==
              arrayOfInstanses[arrayOfInstanses.length - 1]
            ) {
              arrayOfInstanses[i].shouldDisappear = true;
            }
          }
        } else {
          // (Ball_or_Stick instance of Stick) => true
          let sticks_effects = [[], []]; // [0] = stick1, [1] = stick2
          for (let i = 0; i < arrayOfInstanses.length; i++) {
            if (arrayOfInstanses[i].lastHittingStick == stick1) {
              sticks_effects[0].push(arrayOfInstanses[i]);
            } else if (arrayOfInstanses[i].lastHittingStick == stick2) {
              sticks_effects[1].push(arrayOfInstanses[i]);
            }
          }
          for (let i = 0; i < sticks_effects.length; i++) {
            for (let j = 0; j < sticks_effects[i].length; j++) {
              if (
                sticks_effects[i][j] !==
                sticks_effects[i][sticks_effects[i].length - 1]
              ) {
                sticks_effects[i][j].shouldDisappear = true;
              }
            }
          }
        }
      }
      if (CONFIG.debug) {
        console.debug(`Effect is started: ${_this.constructor.name}`);
      }
    }
  }

  effectDisappearance(Ball_or_Stick, ClassName, _this) {
    if (
      Math.floor(
        (Date.now() -
          this.effectStartedTime -
          (this.endOfPauseTime - this.startOfPauseTime)) /
          1000
      ) >= this.effectEndTime
    ) {
      this.isEffectOver = true;
      Ball_or_Stick.effects.splice(Ball_or_Stick.effects.indexOf(ClassName), 1);
      if (CONFIG.debug) {
        console.debug(`Effect is over: ${_this.constructor.name}`);
      }
    }
  }
}

class LongOrShortStick extends SpecialObject {
  constructor(maxHeight, minHeight, reducedWidth, _effectEndTime) {
    super();
    this.maxHeight = maxHeight;
    this.minHeight = minHeight;
    this.reducedWidth = reducedWidth;
    this.chance = Math.random() > 0.5 ? "lengthen" : "shorten";
    this.effectEndTime = _effectEndTime || this.baseEffectEndTime;
  }

  draw() {
    super.drawObject();
    ctx.beginPath();
    ctx.fillStyle = "hsl(0, 0%, 80%)";
    ctx.font = "50px Cambria";
    ctx.fillText("±H", this.x, this.y + 18);
    ctx.stroke();
    ctx.closePath();
  }

  update(mainBall) {
    if (this.shouldDisappear) {
      return;
    }

    if (super.checkDisappearanceTime()) {
      this.shouldDisappear = true;
      return;
    }

    if (this.objectCollidedWithTheMainBall) {
      if (!this.isEffectStarted) {
        this.lastHittingStick = mainBall.lastHittingStick;
        if (this.lastHittingStick == null) {
          this.objectCollidedWithTheMainBall = false;
          super.movementAndCollisionCheck(mainBall);
          this.y += this.dy;
          this.draw();
          return;
        }
      }
      super.effectBegins(this.lastHittingStick, LongOrShortStick, this);

      // После окончания действия эффекта на наложенный объект возвращаем его состояние в исходное
      if (this.isEffectOver) {
        if (this.lastHittingStick.height > CONFIG.stick.height) {
          this.lastHittingStick.height -= 2;
          this.lastHittingStick.y += 1;
        }
        if (this.lastHittingStick.height < CONFIG.stick.height) {
          this.lastHittingStick.height += 2;
          this.lastHittingStick.y -= 1;
        }
        if (this.lastHittingStick.width < CONFIG.stick.width) {
          this.lastHittingStick.width += 1;
        }
        if (
          this.lastHittingStick == stick2 &&
          this.lastHittingStick.x >
            canvas.width - CONFIG.stick.gap - CONFIG.stick.width
        ) {
          this.lastHittingStick.x -= 1;
        }
        return;
      }

      // То что делает эффект, его логика
      if (this.chance == "lengthen") {
        if (this.lastHittingStick.height < this.maxHeight) {
          this.lastHittingStick.height += 2;
          this.lastHittingStick.y -= 1;
        }
        if (this.lastHittingStick.width < CONFIG.stick.width)
          this.lastHittingStick.width += 1;
        if (
          this.lastHittingStick == stick2 &&
          this.lastHittingStick.x >
            canvas.width - CONFIG.stick.gap - CONFIG.stick.width
        ) {
          this.lastHittingStick.x -= 1;
        }
      } else if (this.chance == "shorten") {
        if (this.lastHittingStick.height > this.minHeight) {
          this.lastHittingStick.height -= 2;
          this.lastHittingStick.y += 1;
        }
        if (this.lastHittingStick.width > this.reducedWidth)
          this.lastHittingStick.width -= 1;
        if (
          this.lastHittingStick == stick2 &&
          this.lastHittingStick.x <
            canvas.width - CONFIG.stick.gap - this.reducedWidth
        ) {
          this.lastHittingStick.x += 1;
        }
      }

      super.effectDisappearance(this.lastHittingStick, LongOrShortStick, this);

      return;
    }

    super.movementAndCollisionCheck(mainBall);

    this.y += this.dy;

    this.draw();
  }
}
CONFIG.specialObjects.classesArray.push(LongOrShortStick);

class BigOrSmallBall extends SpecialObject {
  constructor(maxRadius, minRadius, _effectEndTime) {
    super();
    this.maxRadius = maxRadius;
    this.minRadius = minRadius;
    this.effectEndTime = _effectEndTime || this.baseEffectEndTime;
    this.radiusLength = Math.random() > 0.5 ? "lengthen" : "shorten";
  }

  draw() {
    super.drawObject();
    ctx.beginPath();
    ctx.fillStyle = "hsl(0, 0%, 80%)";
    ctx.font = "50px Cambria";
    ctx.fillText("±R", this.x, this.y + 18);
    ctx.stroke();
    ctx.closePath();
  }

  update(mainBall) {
    if (this.shouldDisappear) {
      return;
    }

    if (super.checkDisappearanceTime()) {
      this.shouldDisappear = true;
      return;
    }

    if (this.objectCollidedWithTheMainBall) {
      super.effectBegins(mainBall, BigOrSmallBall, this);

      // После окончания действия эффекта на наложенный объект возвращаем его состояние в исходное
      if (this.isEffectOver) {
        if (mainBall.radius > CONFIG.ball.radius) {
          mainBall.radius -= 1;
        } else if (mainBall.radius < CONFIG.ball.radius) {
          mainBall.radius += 1;
        }
        return;
      }

      // То что делает эффект, его логика
      if (this.radiusLength == "lengthen") {
        if (mainBall.radius < this.maxRadius) {
          mainBall.radius += 1;
        }
      } else if (this.radiusLength == "shorten") {
        if (mainBall.radius > this.minRadius) {
          mainBall.radius -= 1;
        }
      }

      super.effectDisappearance(mainBall, BigOrSmallBall, this);

      return;
    }

    super.movementAndCollisionCheck(mainBall);

    this.y += this.dy;

    this.draw();
  }
}
CONFIG.specialObjects.classesArray.push(BigOrSmallBall);

class LotOfBalls extends SpecialObject {
  constructor(ballsRadius, ballsAmount, _ballsFillStyle, _ballsStrokeStyle) {
    super();
    this.ballsRadius = ballsRadius;
    this.ballsAmount = ballsAmount;
    this.ballsFillStyle = _ballsFillStyle || "hsl(0, 0%, 0%)";
    this.ballsStrokeStyle = _ballsStrokeStyle || "hsl(0, 0%, 100%)";
    this.ballsArray = [];
    this.createBalls();
  }

  createBalls() {
    for (let i = 0; i < this.ballsAmount; i++) {
      const rx = this.x + Math.random() * 10 * generateRandomSign();
      const ry = this.y + Math.random() * 10 * generateRandomSign();
      const rDX = (Math.random() + 0.2) * generateRandomSign(); // Horizontal speed
      const rDY = (Math.random() + 0.2) * generateRandomSign(); // Vertical speed
      this.ballsArray.push(new Circle(rx, ry, rDX, rDY, this.ballsRadius));
    }
  }

  counter(stick) {
    stick.score += 1;
    if (stick1.score > stick2.score) {
      CONFIG.game.winner = stick1;
    } else {
      CONFIG.game.winner = stick2;
    }
  }

  draw() {
    super.drawObject();
    for (let i = 0; i < this.ballsArray.length; i++) {
      // Drawing balls
      ctx.beginPath();
      ctx.lineWidth = 1;
      ctx.fillStyle = this.ballsFillStyle;
      ctx.strokeStyle = this.ballsStrokeStyle;
      ctx.arc(
        this.ballsArray[i].x,
        this.ballsArray[i].y,
        this.ballsRadius,
        0,
        Math.PI * 2,
        false
      );
      ctx.stroke();
      ctx.fill();
      ctx.closePath();
    }
  }

  update(mainBall) {
    if (this.shouldDisappear) {
      return;
    }

    if (super.checkDisappearanceTime()) {
      this.shouldDisappear = true;
      return;
    }

    if (this.objectCollidedWithTheMainBall) {
      if (super.checkDisappearanceTimeNoEffect()) {
        this.shouldDisappear = true;
        return;
      }

      // Логика столкновения с палкой и засчитывание очка
      for (let i = 0; i < this.ballsArray.length; i++) {
        // Засчитывание очка и удаление этого мяча из массива "this.ballsArray"/Scoring and removing this ball from the "this.ballsArray" array
        // border left
        if (this.ballsArray[i].x - this.ballsRadius < 0) {
          this.counter(stick2);
          this.ballsArray.splice(i, 1);
          continue;
        }
        // border right
        if (this.ballsArray[i].x + this.ballsRadius > window.innerWidth) {
          this.counter(stick1);
          this.ballsArray.splice(i, 1);
          continue;
        }

        // Движение мячей по вертикали/Movement of balls vertically
        if (
          // border bottom
          this.ballsArray[i].y + this.ballsRadius >=
            canvas.height - CONFIG.stick.gap ||
          // border top
          this.ballsArray[i].y - this.ballsRadius < CONFIG.stick.gap
        ) {
          this.ballsArray[i].dy = -this.ballsArray[i].dy;
        }

        // 1nd stick collision detection
        if (
          this.ballsArray[i].x - this.ballsRadius <
            stick1.x + stick1.width /* right */ &&
          this.ballsArray[i].y + this.ballsRadius > stick1.y /* top */ &&
          this.ballsArray[i].y < stick1.y + stick1.height /* bottom */
        ) {
          if (!this.ballsArray[i].isCollidedWithStick1) {
            this.ballsArray[i].dx = -(
              this.ballsArray[i].dx +
              this.ballsArray[i].dx * 0.15
            );
            this.ballsArray[i].dy =
              generateRandomSign() *
              Math.floor(Math.random() * (1 - 0.2 + 1) + 0.2);
          }
          this.ballsArray[i].isCollidedWithStick1 = true;
        } else {
          this.ballsArray[i].isCollidedWithStick1 = false;
        }

        // 2nd stick collision detection
        if (
          this.ballsArray[i].x + this.ballsRadius > stick2.x /* left */ &&
          this.ballsArray[i].y + this.ballsRadius > stick2.y /* top */ &&
          this.ballsArray[i].y < stick2.y + stick2.height /* bottom */
        ) {
          if (!this.ballsArray[i].isCollidedWithStick2) {
            this.ballsArray[i].dx = -(
              this.ballsArray[i].dx +
              this.ballsArray[i].dx * 0.15
            );
            this.ballsArray[i].dy =
              generateRandomSign() *
              Math.floor(Math.random() * (1 - 0.2 + 1) + 0.2);
          }
          this.ballsArray[i].isCollidedWithStick2 = true;
        } else {
          this.ballsArray[i].isCollidedWithStick2 = false;
        }

        this.ballsArray[i].x += this.ballsArray[i].dx;
        this.ballsArray[i].y += this.ballsArray[i].dy;

        // Drawing balls
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.fillStyle = this.ballsFillStyle;
        ctx.strokeStyle = this.ballsStrokeStyle;
        ctx.arc(
          this.ballsArray[i].x,
          this.ballsArray[i].y,
          this.ballsRadius,
          0,
          Math.PI * 2,
          false
        );
        ctx.stroke();
        ctx.fill();
        ctx.closePath();
      }

      if (this.ballsArray.length == 0) {
        this.shouldDisappear = true;
      }
      return;
    }

    // Столкновение мячей об стенку большого круга/Balls collision with a big Circle's wall
    for (let i = 0; i < this.ballsArray.length; i++) {
      if (
        Math.sqrt(
          Math.pow(this.x - this.ballsArray[i].x, 2) +
            Math.pow(this.y - this.ballsArray[i].y, 2)
        ) >
        this.radius - this.ballsArray[i].radius
      ) {
        if (!this.ballsArray[i].isCollidedWithBigCircle) {
          this.ballsArray[i].dx = -this.ballsArray[i].dx;
          this.ballsArray[i].dy = -this.ballsArray[i].dy;
        } else {
          this.ballsArray[i].x = this.x;
          this.ballsArray[i].y = this.y;
        }
        this.ballsArray[i].isCollidedWithBigCircle = true;
      } else {
        this.ballsArray[i].isCollidedWithBigCircle = false;
      }

      this.ballsArray[i].x += this.ballsArray[i].dx;
      this.ballsArray[i].y += this.ballsArray[i].dy;
    }

    super.movementAndCollisionCheck(mainBall);

    this.y += this.dy;

    this.draw();
  }
}
CONFIG.specialObjects.classesArray.push(LotOfBalls);

class Circle {
  constructor(x, y, dx, dy, radius, _color) {
    this.x = x;
    this.y = y;
    this.dx = dx; /* X speed */
    this.dy = dy; /* Y speed */
    this.radius = radius;
    this.isCollidedWithStick1 = false;
    this.isCollidedWithStick2 = false;
    this.isCollidedWithBigCircle = false;
    this.lastHittingStick = null;
    this.effects = [];
    this.color = _color || "hsl(0, 0%, 80%)";
  }

  debug() {
    this.x = CONFIG.mouseX;
    this.y = CONFIG.mouseY;
    this.draw();
  }

  draw() {
    ctx.beginPath();
    ctx.strokeStyle = "hsl(0, 0%, 0%)";
    ctx.lineWidth = 1;
    ctx.fillStyle = this.color;
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
  }

  counter(stick) {
    stick.score += 1;
    if (stick1.score > stick2.score) {
      CONFIG.game.winner = stick1;
    } else {
      CONFIG.game.winner = stick2;
    }

    for (let i = 0; i < this.effects.length; i++) {
      CONFIG.specialObjects.eventsArray.forEach((el) => {
        if (el instanceof this.effects[i] && el.objectCollidedWithTheMainBall) {
          el.shouldDisappear = true;
        }
      });
    }

    resetMainBallPosition();
  }

  update() {
    // border left
    if (this.x - this.radius < 0) {
      return this.counter(stick2);
    }
    // border right
    if (this.x + this.radius > canvas.width) {
      return this.counter(stick1);
    }

    if (
      // border bottom
      this.y + this.radius >= canvas.height - CONFIG.stick.gap ||
      // border top
      this.y - this.radius < CONFIG.stick.gap
    ) {
      this.dy = -this.dy;
    }

    // 1nd stick collision detection
    if (
      this.x - this.radius < stick1.x + stick1.width /* right */ &&
      this.y + this.radius > stick1.y /* top */ &&
      this.y < stick1.y + stick1.height /* bottom */
    ) {
      if (!this.isCollidedWithStick1) {
        if (Math.abs(this.dx) < CONFIG.ball.maxSpeed) {
          this.dx = -(this.dx + this.dx * 0.05);
          this.dy = generateRandomVelocities().ry;
        } else {
          this.dx = -this.dx;
          this.dy = generateRandomVelocities(null, CONFIG.ball.maxAngle).ry;
        }
        this.isCollidedWithStick1 = true;
        this.lastHittingStick = stick1;
      }
    } else {
      this.isCollidedWithStick1 = false;
    }

    // 2nd stick collision detection
    if (
      this.x + this.radius > stick2.x /* left */ &&
      this.y + this.radius > stick2.y /* top */ &&
      this.y < stick2.y + stick2.height /* bottom */
    ) {
      if (!this.isCollidedWithStick2) {
        if (Math.abs(this.dx) < CONFIG.ball.maxSpeed) {
          this.dx = -(this.dx + this.dx * 0.05);
          this.dy = generateRandomVelocities().rx;
        } else {
          this.dx = -this.dx;
          this.dy = generateRandomVelocities(null, CONFIG.ball.maxAngle).ry;
        }
        this.isCollidedWithStick2 = true;
        this.lastHittingStick = stick2;
      }
    } else {
      this.isCollidedWithStick2 = false;
    }

    this.x += this.dx;
    this.y += this.dy;

    this.draw();
  }
}

class Stick {
  constructor(position_X, width, height, speed, gap, controls, _color) {
    this.x = position_X;
    this.width = width;
    this.height = height;
    this.gap = gap;
    this.y = window.innerHeight / 2 - this.height / 2;
    this.dy = speed;
    this.controls = controls;
    this.keys = { up: false, down: false };
    this.color = _color || "hsl(0, 0%, 80%)";
    this.score = 0;
    this.effects = [];
  }

  draw() {
    ctx.beginPath();
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.closePath();
  }

  update() {
    // bottom
    if (!(this.y + this.height + this.gap > canvas.height)) {
      if (this.keys.down) this.y += this.dy;
    }
    if (this.y + this.height + this.gap > canvas.height) {
      this.y = canvas.height - this.height - this.gap;
    }

    // up
    if (!(this.y < this.gap)) {
      if (this.keys.up) this.y -= this.dy;
    }
    if (this.y < this.gap) {
      this.y = this.gap;
    }

    this.draw();
  }
}

// Создаём палки и основного мяча перед началом геймплея/Creating sticks and main ball before the start of the gameplay
resetSticksPosition();
resetMainBallPosition();

// Ввод/Input
let isOnPause = true;
window.addEventListener("keydown", (e) => {
  if (
    (e.key.toLowerCase() == " " || e.key.toLowerCase() == "escape") &&
    !CONFIG.game.isOver
  ) {
    if (isOnPause) {
      window.cancelAnimationFrame(RAF_ID);
      ctx.fillStyle = "hsla(0, 0%, 1%, 0.6)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "white";
      ctx.font = "60px Arial";
      ctx.fillText("PAUSE", canvas.width / 2, canvas.height / 2);

      intervals.forEach((i) => {
        clearInterval(i);
      });
      timeouts.forEach((i) => {
        clearTimeout(i);
      });

      CONFIG.specialObjects.eventsArray.forEach((i) => {
        i.startOfPauseTime += Date.now();
      });
    } else {
      window.requestAnimationFrame(game_loop);

      const interval_ID = setInterval(
        eventCaller,
        Number(`${CONFIG.eventTimeRanges.appearanceInterval}000`)
      );
      intervals.push(interval_ID);

      CONFIG.specialObjects.eventsArray.forEach((i) => {
        i.endOfPauseTime += Date.now();
      });

      if (CONFIG.debug) {
        console.debug("Intervals & Timeouts were reset");
      }
    }
    isOnPause = !isOnPause;
  }
  // Начать заново игру с предыдущим очком выигрыша/Restart the game with previous win-point
  if (e.key.toLowerCase() == "enter" && CONFIG.game.isOver) {
    CONFIG.game.isOver = false;
    CONFIG.specialObjects.eventStarted = false;
    CONFIG.specialObjects.objectsToBeCreated.length = 0;
    CONFIG.specialObjects.eventsArray.length = 0;
    resetSticksPosition();
    resetMainBallPosition();
    console.debug("Game was restarted!");
  }
  sticks.forEach((stick) => {
    switch (e.key.toLowerCase()) {
      case stick.controls.up:
        stick.keys.up = true;
        break;
      case stick.controls.down:
        stick.keys.down = true;
        break;
      default:
        break;
    }
  });
});
window.addEventListener("keyup", (e) => {
  sticks.forEach((stick) => {
    switch (e.key.toLowerCase()) {
      case stick.controls.up:
        stick.keys.up = false;
        break;
      case stick.controls.down:
        stick.keys.down = false;
        break;
      default:
        break;
    }
  });
});

// Генерация рандомного направления/Generation of different direction
function generateRandomSign() {
  const rs = Math.random() - 0.5;
  const s = rs < 0 ? -1 : 1;
  return s;
}

// Генерация рандомных скоростей с разным направлением для dX & dY/Generation of random velocities with different directions for dX & dY
function generateRandomVelocities(speedX, speedY) {
  const rx = generateRandomSign() * (speedX || CONFIG.ball.minSpeed);
  const ry =
    generateRandomSign() * Math.random() * (speedY || CONFIG.ball.minAngle);
  return { rx, ry };
}

// Сбрасываем позицию основного мяча в центр/Reset main ball position to center
function resetMainBallPosition() {
  c = new Circle(
    canvas.width / 2,
    canvas.height / 2,
    generateRandomVelocities().rx,
    generateRandomVelocities().ry,
    CONFIG.ball.radius
  );
}

// Сбрасываем позицию палки в центр по бокам экрана/Reset stick position to center on screen sides
function resetSticksPosition(_stick) {
  if (_stick == undefined) {
    stick1 = new Stick(
      CONFIG.stick.gap,
      CONFIG.stick.width,
      CONFIG.stick.height,
      CONFIG.stick.speed,
      CONFIG.stick.gap,
      { up: "w", down: "s" }
    );
    stick2 = new Stick(
      canvas.width - CONFIG.stick.width - CONFIG.stick.gap,
      CONFIG.stick.width,
      CONFIG.stick.height,
      CONFIG.stick.speed,
      CONFIG.stick.gap,
      {
        up: "arrowup",
        down: "arrowdown",
      }
    );
    sticks[0] = stick1;
    sticks[1] = stick2;
  } else if (_stick == stick1) {
    stick1 = new Stick(
      CONFIG.stick.gap,
      CONFIG.stick.width,
      CONFIG.stick.height,
      CONFIG.stick.speed,
      CONFIG.stick.gap,
      { up: "w", down: "s" }
    );
    sticks[0] = stick1;
  } else if (_stick == stick2) {
    stick2 = new Stick(
      canvas.width - CONFIG.stick.width - CONFIG.stick.gap,
      CONFIG.stick.width,
      CONFIG.stick.height,
      CONFIG.stick.speed,
      CONFIG.stick.gap,
      {
        up: "arrowup",
        down: "arrowdown",
      }
    );
    sticks[1] = stick2;
  }
}

// Здесь мы создаём объекты и добавляем их в CONFIG.specialObjects.eventsArray для отрисовки
function createNewInstance(functionNameOnly, i) {
  // EventsArray: append a new instance of this class (LotOfBalls)
  CONFIG.specialObjects.eventsArray.push(functionNameOnly());

  // ObjectsToBeCreated: delete this class after creating a new instance from this array (ObjectsToBeCreated)
  CONFIG.specialObjects.objectsToBeCreated.splice(i, 1);
}

// Начинает событие - появление и исчезновения специальных объектов/Starts an event - appearance of special objects
function eventCaller() {
  const randomTime = Math.floor(
    Math.random() *
      (CONFIG.eventTimeRanges.max - CONFIG.eventTimeRanges.min + 1) +
      CONFIG.eventTimeRanges.min
  );
  if (CONFIG.debug) {
    console.debug(`---------------------------\nRandom time: ${randomTime}s`);
  }
  const randomEvent =
    CONFIG.specialObjects.classesArray[
      Math.floor(Math.random() * CONFIG.specialObjects.classesArray.length)
    ];
  if (CONFIG.debug) {
    console.debug(
      `Random event: ${randomEvent.name}\n---------------------------`
    );
  }
  const timeout_ID = setTimeout(() => {
    CONFIG.specialObjects.objectsToBeCreated.push(randomEvent);
  }, Number(`${randomTime}000`));
  timeouts.push(timeout_ID);
  CONFIG.specialObjects.eventsArray.forEach((el, i) => {
    if (el.shouldDisappear) {
      CONFIG.specialObjects.eventsArray.splice(i, 1);
    }
  });
}

// Создание экземпляров/Creating instances
function createNewLotOfBalls() {
  const instance = new LotOfBalls(
    CONFIG.specialObjects.objects.LotOfBalls.ballsRadius,
    CONFIG.specialObjects.objects.LotOfBalls.ballsAmount
  );
  return instance;
}
function createNewBigOrSmallBall() {
  const instance = new BigOrSmallBall(
    CONFIG.specialObjects.objects.BigOrSmallBall.maxRadius,
    CONFIG.specialObjects.objects.BigOrSmallBall.minRadius,
    CONFIG.specialObjects.objects.BigOrSmallBall.effectEndTime
  );
  return instance;
}
function createNewLongOrShortStick() {
  const instance = new LongOrShortStick(
    CONFIG.specialObjects.objects.LongOrShortStick.maxHeight,
    CONFIG.specialObjects.objects.LongOrShortStick.minHeight,
    CONFIG.specialObjects.objects.LongOrShortStick.reducedWidth
  );
  return instance;
}

// Игровой процесс/Gameplay
function game_loop() {
  RAF_ID = window.requestAnimationFrame(game_loop);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Проверяем, закончилась ли игра?
  if (CONFIG.game.isOver) {
    CONFIG.game.winner.update();

    ctx.font = "60px Arial";
    ctx.fillText(`${stick1.score}`, canvas.width / 2 - 175, canvas.height / 2);
    ctx.fillText(`${stick2.score}`, canvas.width / 2 + 175, canvas.height / 2);
    ctx.fillText("Restart?", canvas.width / 2, canvas.height / 2 - 150);
    ctx.font = "25px Arial";
    ctx.fillText(
      `FT ${CONFIG.game.maxScore}`,
      canvas.width / 2,
      canvas.height / 2 - 90
    );
    ctx.fillText('(Press "Enter")', canvas.width / 2, canvas.height / 2 - 120);

    return;
  }

  // Проверяем, закончить ли игру?
  if (
    stick2.score >= CONFIG.game.maxScore ||
    stick1.score >= CONFIG.game.maxScore
  ) {
    CONFIG.game.isOver = true;
    intervals.forEach((i) => {
      clearInterval(i);
    });
    timeouts.forEach((i) => {
      clearTimeout(i);
    });
    return;
  }

  stick1.update();
  stick2.update();

  c.update();

  // Здесь мы создаём экземпляры и добавляем их в CONFIG.specialObjects.eventsArray для отрисовки
  for (let i = 0; i < CONFIG.specialObjects.objectsToBeCreated.length; i++) {
    // ObjectsToBeCreated: every iteration must have one of the classes from: "CONFIG.specialObjects.classesArray". Important! Exactly the class, not the instance
    switch (CONFIG.specialObjects.objectsToBeCreated[i]) {
      case LotOfBalls:
        createNewInstance(createNewLotOfBalls, i);
        break;
      case BigOrSmallBall:
        createNewInstance(createNewBigOrSmallBall, i);
        break;
      case LongOrShortStick:
        createNewInstance(createNewLongOrShortStick, i);
        break;

      default:
        break;
    }
  }

  // Отрисовка
  for (let i = 0; i < CONFIG.specialObjects.eventsArray.length; i++) {
    CONFIG.specialObjects.eventsArray[i].update(c);
  }

  // Начать событие - появление специальных объектов/Start an event - appearance of special objects
  if (!CONFIG.game.isOver) {
    if (!CONFIG.specialObjects.eventStarted) {
      const interval_ID = setInterval(
        eventCaller,
        Number(`${CONFIG.eventTimeRanges.appearanceInterval}000`)
      );
      intervals.push(interval_ID);
    }
    CONFIG.specialObjects.eventStarted = true;
  } else {
    CONFIG.specialObjects.eventStarted = false;
  }

  // Счёт/Count
  ctx.fillStyle = "hsl(0, 0%, 80%)";
  ctx.font = "25px Arial";
  ctx.fillText(`FT ${CONFIG.game.maxScore}`, canvas.width / 2, 90);
  ctx.font = "60px Arial";
  ctx.fillText(`${stick1.score}`, canvas.width / 2 - 175, 100);
  ctx.fillText(`${stick2.score}`, canvas.width / 2 + 175, 100);
}

game_loop();

if (CONFIG.debug) {
  canvas.addEventListener("mousedown", (e) => {
    CONFIG.mouseX = e.offsetX;
    CONFIG.mouseY = e.offsetY;
    // console.debug(`X: ${e.offsetX}, Y: ${e.offsetY}`);
  });
}
