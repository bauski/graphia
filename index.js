const express = require('express')
const sqlite = require('sqlite3').verbose()
const graphql = require('graphql')
const expressGraphql = require('express-graphql').graphqlHTTP

const app = express()
const db = new sqlite.Database('./graphia.db')

createUserTable = () => {
    const query = `
        CREATE TABLE IF NOT EXISTS users( 
            id integer PRIMARY KEY AUTOINCREMENT,
            name text,
            password text,
            email text UNIQUE
        )`
    return db.run(query)
}
createUserTable()

const userType = new graphql.GraphQLObjectType({
    name: 'user',
    fields: {
        id: {type: graphql.GraphQLObjectID},
        name: {type: graphql.GraphQLString},
        email: {type: graphql.GraphQLString},
        password: {type: graphql.GraphQLString}
    }
})

let queryType = new graphql.GraphQLObjectType({
    name: 'query',
    fields: {
        users: {
            type: new graphql.GraphQLList(userType),
            resolve: (root, args, context, info) => {
                return new Promise((resolve, reject) => {
                    db.all(`SELECT * FROM users;`,
                        (err, rows) => {
                            if (err) reject([])
                            resolve(rows)
                        }
                    )
                })
            }
        },
        user: {
            type: userType,
            args: {
                id: {
                    type: new graphql.GraphQLNonNull(graphql.GraphQLID)
                }
            },
            resolve: (root, {id}, context, info) => {
                return new Promise((resolve, reject) => {
                    db.all(`SELECT * FROM users WHERE id = ${id}`,
                        (err, rows) => {
                            if (err) reject(null)
                            resolve(rows[0])
                        }
                    )
                })
            }
        }
    }
})

let mutationType = new graphql.GraphQLObjectType({
    name: 'mutation',
    fields: {
        createUser: {
            type: userType,
            args: {
                name: {
                    type: new graphql.GraphQLNonNull(graphql.GraphQLString)
                },
                email: {
                    type: new graphql.GraphQLNonNull(graphql.GraphQLString)
                },
                password: {
                    type: new graphql.GraphQLNonNull(graphql.GraphQLString)
                }
            },
            resolve: (root, {name, email, password}) => {
                return new Promise((resolve, reject) => {
                    db.run(
                        `INSERT INTO users 
                            (name, email, password) 
                        VALUES 
                            (${name}, ${email}, ${password});`,
                        (err) => {
                            if (err) reject(null)
                            db.get('SELECT last_insert_rowid() as id',
                            (err, row) => {
                                resolve({
                                    id: row['id'],
                                    name: name,
                                    email: email,
                                    password: password
                                })
                            })
                        }
                    )
                })
            }
        },
        updateUser: {
            type: graphql.GraphQLString,
            args: {
                id: {
                    type: new graphql.GraphQLNonNull(graphql.GraphQLID)
                },
                username: {
                    type: new graphql.GraphQLNonNull(graphql.GraphQLString)
                },
                email: {
                    type: new graphql.GraphQLNonNull(graphql.GraphQLString)
                },
                password: {
                    type: new graphql.GraphQLNonNull(graphql.GraphQLString)
                }
            },
            resolve: (root, {id, name, email, password}) => {
                return new Promise((resolve, reject) => {
                    db.run(
                        `UPATE users 
                        SET name = ${name}, email = ${email}, password = ${password}`, 
                        (err) => {
                            if (err) reject(err)
                            resolve(`User #${id} updated`)
                        })
                })
            }
        },
        deleteUser: {
            type: graphql.GraphQLNonString,
            args: {
                id: {
                    type: new graphql.GraphQLNonNull(graphql.GraphQLID)
                }
            },
            resolve: (root, {id}) => {
                return new Promise((resolve, reject) => {
                    db.run(`
                        DELETE FROM users WHERE ID = ${id}`,
                        (err) => {
                            if (err) reject(err)
                            resolve(`User #${id} deleted`)
                    })
                })
            }
        }
    }
})

const schema = new graphql.GraphQLSchema({
    query: queryType,
    mutation: mutationType
})

app.use("/graphql", expressGraphql({ schema: schema, graphiql: true}));
app.listen(4000, () => {
    console.log("GraphQL server running at http://localhost:4000.");
});
