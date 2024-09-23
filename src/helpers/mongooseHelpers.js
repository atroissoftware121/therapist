const findQuery = async (collection, query, select) => {
  try {
    const findMethod = query?._id ? "findById" : "find";
    const resolvedQuery = query?._id || query;
    const queryOutput = await collection[findMethod](resolvedQuery, select);
    return queryOutput;
  } catch (error) {
    throw new Error(error.message);
  }
};


const findQueryWithLimit = (collection, query, select,limit,skip) => {
  let findMethod = query?._id ? "findById" : "find";
  query = query?._id || query;
  return new Promise(async (resolve, _reject) => {
    let queryOutput = await collection[findMethod](query, select).limit(limit).skip(skip);
    resolve(queryOutput);
  });
};
/**
 * findQueryWithPagining
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const findQueryWithPagining = async (collection, filter, options) => {
  console.log('options', options);
  options.sort = { updatedAt: -1 };
  return collection["paginate"](filter, options);
};

const updateQuery = (collection, query, updatedValue) => {
  let updateMethod = query?._id ? "findByIdAndUpdate" : "findOneAndUpdate";
  query = query?._id || query;
  return new Promise(async (resolve, reject) => {
    let queryOutput = await collection[updateMethod](query, updatedValue, {
      new: true,
      upsert: true
    });
    resolve(queryOutput);
  });
};

const createQuery = (collection, saveObj) => {
  return new Promise(async (resolve, reject) => {
    try {
      let collectionObj = await collection.create(saveObj);
      resolve(collectionObj.toObject());
    } catch (error) {
      console.log("createQuery error==>", error);
      reject(false);
    }
  });
};

const deleteQuery = (collection, query) => {
  console.log(query);
  console.log(collection);
  return new Promise(async (resolve, reject) => {
    try {
      const result = await collection.deleteMany(query);
      console.log(result);
      resolve(true);
    } catch (error) {
      resolve(false);
      console.log("deleteQuery error==>", error);
    }
  });
};

module.exports = {
  findQuery,
  updateQuery,
  createQuery,
  deleteQuery,
  findQueryWithPagining,
  findQueryWithLimit
};
