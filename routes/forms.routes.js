const router = require('express').Router();
const formService = require('../services/form.service');

router.get('/', formService.getForms);
router.post('/', formService.createForm);
router.get('/:id', formService.getFormById);
router.delete('/:id', formService.deleteForm);

module.exports = router;
