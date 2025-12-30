const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("ConsentV4Module", (m) => {
  const consent = m.contract("ConsentV4");
  return { consent };
});