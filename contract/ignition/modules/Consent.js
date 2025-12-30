const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("ConsentModule", (m) => {
  const consent = m.contract("Consent");

  return { consent };
});