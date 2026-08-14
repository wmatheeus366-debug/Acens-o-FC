/* CRAQUE — desenho de campo em canvas, vendorizado (gerado por
   scripts/vendor-football2d.mjs — NÃO editar à mão). Busca externa só em tempo de
   setup, nunca em tempo de execução pro jogador.

   Fonte: cyntler/football2d (https://github.com/cyntler/football2d), por Damian
   Cyntler. Licença MIT. Só `drawField`/`getGameDimensions`/constantes de proporção
   são usados aqui — o pacote não desenha jogador/bola (ver cabeçalho do script de
   vendor pro motivo). Consumido só dentro de js/pitch.js (buildPitchCanvas). */
var __CQ_F2D__ = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // _craque_entry.ts
  var craque_entry_exports = {};
  __export(craque_entry_exports, {
    FIELD_GOAL_WIDTH: () => FIELD_GOAL_WIDTH,
    FIELD_HEIGHT: () => FIELD_HEIGHT,
    FIELD_MARGIN: () => FIELD_MARGIN,
    FIELD_WIDTH: () => FIELD_WIDTH,
    drawField: () => drawField,
    getGameDimensions: () => getGameDimensions
  });

  // src/utils/composeExecute.ts
  var composeExecute = (args, ...fns) => fns.forEach((fn) => fn(...args));

  // src/constants.ts
  var FIELD_WIDTH = 125;
  var FIELD_HEIGHT = 85;
  var FIELD_MARGIN = 45;
  var FIELD_GOAL_WIDTH = 20;
  var FIELD_PRIMARY_COLOR = "rgb(86, 140, 43)";
  var FIELD_SECONDARY_COLOR = "rgb(78, 125, 40)";
  var FIELD_ACCENT_COLOR = "rgb(255, 255, 255)";
  var FIELD_LINE_WIDTH = 2;

  // src/utils/getFullCanvasDimensions.ts
  var getFullCanvasDimensions = (canvasContext) => {
    const fullCanvasWidth = canvasContext.canvas.width;
    const fullCanvasHeight = canvasContext.canvas.height;
    return { fullCanvasWidth, fullCanvasHeight };
  };

  // src/draw/field/parts/drawFieldGrass.ts
  var drawFieldGrass = (canvasContext, { x, y, width, height }) => {
    const { fullCanvasWidth, fullCanvasHeight } = getFullCanvasDimensions(canvasContext);
    const secondaryColorStripsCount = 9;
    const stripWidth = (width - x) / secondaryColorStripsCount;
    canvasContext.fillStyle = FIELD_PRIMARY_COLOR;
    canvasContext.fillRect(0, 0, fullCanvasWidth, fullCanvasHeight);
    canvasContext.fillStyle = FIELD_SECONDARY_COLOR;
    [...new Array(secondaryColorStripsCount)].forEach((_, i) => {
      if (i % 2 === 0) {
        canvasContext.fillRect(x + i * stripWidth, y, stripWidth, height - y);
      }
    });
  };

  // src/draw/field/parts/drawFieldMainLines.ts
  var drawFieldMainLines = (canvasContext, { x, y, width, height }) => {
    canvasContext.beginPath();
    canvasContext.rect(x, y, width - FIELD_MARGIN, height - FIELD_MARGIN);
    canvasContext.lineWidth = FIELD_LINE_WIDTH;
    canvasContext.strokeStyle = FIELD_ACCENT_COLOR;
    canvasContext.stroke();
    canvasContext.closePath();
  };

  // src/utils/calculateValueDependsGameDimension.ts
  var calculateValueDependsWidthGameDimension = (value, { width }, minValue) => {
    const result = value / FIELD_WIDTH * width;
    if (minValue && result < minValue) {
      return minValue;
    }
    return result;
  };
  var calculateValueDependsHeightGameDimension = (value, { height }, minValue) => {
    const result = value / FIELD_HEIGHT * height;
    if (minValue && result < minValue) {
      return minValue;
    }
    return result;
  };

  // src/draw/field/parts/drawFieldCenterLines.ts
  var drawFieldCenterLines = (canvasContext, gameDimensions) => {
    const { y, height } = gameDimensions;
    const { fullCanvasWidth, fullCanvasHeight } = getFullCanvasDimensions(canvasContext);
    canvasContext.fillStyle = FIELD_ACCENT_COLOR;
    canvasContext.beginPath();
    canvasContext.moveTo(fullCanvasWidth / 2, y);
    canvasContext.lineTo(fullCanvasWidth / 2, height);
    canvasContext.stroke();
    canvasContext.closePath();
    canvasContext.beginPath();
    canvasContext.arc(
      fullCanvasWidth / 2,
      fullCanvasHeight / 2,
      FIELD_LINE_WIDTH + 1,
      0,
      2 * Math.PI,
      false
    );
    canvasContext.fill();
    canvasContext.closePath();
    canvasContext.beginPath();
    canvasContext.arc(
      fullCanvasWidth / 2,
      fullCanvasHeight / 2,
      calculateValueDependsWidthGameDimension(9.15, gameDimensions),
      0,
      2 * Math.PI,
      false
    );
    canvasContext.stroke();
    canvasContext.closePath();
  };

  // src/draw/field/utils.ts
  var getBigGoalLineDimensions = (gameDimensions) => ({
    width: calculateValueDependsWidthGameDimension(16.5, gameDimensions),
    height: calculateValueDependsHeightGameDimension(40.32, gameDimensions)
  });
  var getSmallGoalLineDimensions = (gameDimensions) => ({
    width: calculateValueDependsHeightGameDimension(5.5, gameDimensions),
    height: calculateValueDependsHeightGameDimension(18.32, gameDimensions)
  });
  var drawCorner = (canvasContext, x, y, radius, startAngle, endAngle, counterclockwise = false) => {
    canvasContext.beginPath();
    canvasContext.arc(x, y, radius, startAngle, endAngle, counterclockwise);
    canvasContext.stroke();
    canvasContext.closePath();
  };
  var drawGoal = (canvasContext, gameDimensions, x) => {
    const { fullCanvasHeight } = getFullCanvasDimensions(canvasContext);
    const goalY = fullCanvasHeight / 2;
    const halfOfGoalHeight = calculateValueDependsWidthGameDimension(
      3.66,
      gameDimensions
    );
    canvasContext.beginPath();
    canvasContext.moveTo(x, goalY - halfOfGoalHeight);
    canvasContext.lineTo(x, goalY + halfOfGoalHeight);
    canvasContext.stroke();
    canvasContext.closePath();
  };
  var drawGoalLines = (canvasContext, gameDimensions, type) => {
    const { width, x } = gameDimensions;
    const { fullCanvasHeight } = getFullCanvasDimensions(canvasContext);
    const { width: bigGoalLineWidth, height: bigGoalLineHeight } = getBigGoalLineDimensions(gameDimensions);
    const { width: smallGoalLineWidth, height: smallGoalLineHeight } = getSmallGoalLineDimensions(gameDimensions);
    const radius = calculateValueDependsWidthGameDimension(9.15, gameDimensions);
    canvasContext.beginPath();
    canvasContext.rect(
      type === "left" ? x : width - bigGoalLineWidth,
      (fullCanvasHeight - bigGoalLineHeight) / 2,
      bigGoalLineWidth,
      bigGoalLineHeight
    );
    canvasContext.stroke();
    canvasContext.closePath();
    canvasContext.beginPath();
    canvasContext.rect(
      type === "left" ? x : width - smallGoalLineWidth,
      (fullCanvasHeight - smallGoalLineHeight) / 2,
      smallGoalLineWidth,
      smallGoalLineHeight
    );
    canvasContext.stroke();
    canvasContext.closePath();
    canvasContext.beginPath();
    canvasContext.arc(
      type === "left" ? calculateValueDependsWidthGameDimension(11, gameDimensions) + FIELD_MARGIN : width - calculateValueDependsWidthGameDimension(11, gameDimensions),
      fullCanvasHeight / 2,
      FIELD_LINE_WIDTH + 1,
      0,
      2 * Math.PI,
      true
    );
    canvasContext.fill();
    canvasContext.closePath();
    canvasContext.beginPath();
    canvasContext.arc(
      type === "left" ? x + calculateValueDependsWidthGameDimension(16.5, gameDimensions) - radius / 1.65 : width - calculateValueDependsWidthGameDimension(16.5, gameDimensions) + radius / 1.65,
      fullCanvasHeight / 2,
      radius,
      (type === "left" ? 0.29 : 0.71) * Math.PI,
      (type === "left" ? 1.71 : 1.29) * Math.PI,
      type === "left"
    );
    canvasContext.stroke();
    canvasContext.closePath();
  };

  // src/draw/field/parts/drawFieldCorners.ts
  var drawFieldCorners = (canvasContext, gameDimensions) => {
    const { x, y, width, height } = gameDimensions;
    const cornerRadius = calculateValueDependsHeightGameDimension(
      1,
      gameDimensions
    );
    drawCorner(canvasContext, x, y, cornerRadius, 0, 0.5 * Math.PI);
    drawCorner(canvasContext, x, height, cornerRadius, 0, -0.5 * Math.PI, true);
    drawCorner(canvasContext, width, y, cornerRadius, 0.5 * Math.PI, Math.PI);
    drawCorner(
      canvasContext,
      width,
      height,
      cornerRadius,
      1 * Math.PI,
      1.5 * Math.PI
    );
  };

  // src/draw/field/parts/drawFieldLeftGoalLines.ts
  var drawFieldLeftGoalLines = (canvasContext, gameDimensions) => {
    drawGoalLines(canvasContext, gameDimensions, "left");
  };

  // src/draw/field/parts/drawFieldRightGoalLines.ts
  var drawFieldRightGoalLines = (canvasContext, gameDimensions) => {
    drawGoalLines(canvasContext, gameDimensions, "right");
  };

  // src/draw/field/parts/drawFieldGoals.ts
  var drawFieldGoals = (canvasContext, gameDimensions) => {
    const { width, x } = gameDimensions;
    canvasContext.lineWidth = FIELD_GOAL_WIDTH * (width / 1300);
    drawGoal(canvasContext, gameDimensions, x - canvasContext.lineWidth / 2);
    drawGoal(canvasContext, gameDimensions, width + canvasContext.lineWidth / 2);
  };

  // src/draw/field/drawField.ts
  var drawField = (canvasContext, gameDimensions) => {
    composeExecute(
      [canvasContext, gameDimensions],
      drawFieldGrass,
      drawFieldMainLines,
      drawFieldCenterLines,
      drawFieldLeftGoalLines,
      drawFieldRightGoalLines,
      drawFieldCorners,
      drawFieldGoals
    );
  };

  // src/utils/getGameDimensions.ts
  var getGameDimensions = (canvasContext) => {
    const { fullCanvasWidth, fullCanvasHeight } = getFullCanvasDimensions(canvasContext);
    const x = FIELD_MARGIN;
    const y = FIELD_MARGIN;
    const width = fullCanvasWidth - FIELD_MARGIN;
    const height = fullCanvasHeight - FIELD_MARGIN;
    return {
      x,
      y,
      width,
      height
    };
  };
  return __toCommonJS(craque_entry_exports);
})();

window.CQ_FOOTBALL2D = __CQ_F2D__;
