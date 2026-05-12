const router = require('express').Router();
const responseService = require('../services/response.service');

router.post('/:formId', responseService.sendResponse);
router.get('/:formId', responseService.getResponses);
router.get('/queue/next', responseService.getNextInQueue);

module.exports = router;
