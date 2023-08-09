const findQuery = (collection, query, select) => {
  let findMethod = query?._id ? "findById" : "find";
  query = query?._id || query;
  return new Promise(async (resolve, _reject) => {
    let queryOutput = await collection[findMethod](query, select)
    resolve(queryOutput);
  });
};

const updateQuery = (collection, query, updatedValue) => {
  let updateMethod = query?._id ? "findByIdAndUpdate" : "findOneAndUpdate";
  query = query?._id || query;
  return new Promise(async (resolve, reject) => {
    let queryOutput = await collection[updateMethod](query, updatedValue, {
      new: true,
    });
    resolve(queryOutput);
  });
};

const createQuery = (collection, saveObj) => {
  return new Promise(async (resolve, reject) => {
    try {
      let collectionObj = await collection.create(saveObj);
      resolve(collectionObj._doc);
    } catch (error) {
      console.log("createQuery error==>", error);
      reject(false);
    }
  });
};

const deleteQuery = (collection, query) => {
  console.log(query)
  console.log(collection)
  return new Promise(async (resolve, reject) => {
    try {
      const result=await collection.deleteMany(query);
      console.log(result)
      resolve(true);
    } catch (error) {
      resolve(false);
      console.log("deleteQuery error==>", error);
    }
  });
};

module.exports = { findQuery, updateQuery, createQuery, deleteQuery };
