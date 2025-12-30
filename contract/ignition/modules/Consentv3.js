const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("ConsentV3Module", (m) => {
  // This tells Hardhat to look for "ConsentV3.sol"
  const consent = m.contract("ConsentV3");

  return { consent };
});