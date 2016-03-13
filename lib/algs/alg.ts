import {Session, IAlgorithm} from "graphene-pk11";
import {P11CryptoKey, KT_PRIVATE, KT_PUBLIC, KT_SECRET} from "../key";
import * as error from "../error";

export type KeyUsages = "sign" | "verify" | "encrypt" | "decrypt" | "wrapKey" | "unwrapKey" | "deriveKey";

export interface IJwk {
    kty: string;
    ext: boolean;
    usage?: string;
    key_ops?: string[];
}

export interface IJwkSecret extends IJwk {
    k: string;
    alg: string;
}

export interface IAlgorithmHashed extends Algorithm {
    hash: Algorithm;
}

export const RSA_HASH_ALGS = ["SHA-1", "SHA-224", "SHA-256", "SHA-384", "SHA-512"];

export interface IAlgorithmBase {
    generateKey(session: Session, alg: Algorithm, extractable: boolean, keyUsages: string[], callback: (err: Error, key: CryptoKey | CryptoKeyPair) => void): void;
    sign(session: Session, alg: Algorithm, key: CryptoKey, data: Buffer, callback: (err: Error, signature: Buffer) => void): void;
    verify(session: Session, alg: Algorithm, key: CryptoKey, signature: Buffer, data: Buffer, callback: (err: Error, verify: boolean) => void): void;
    encrypt(session: Session, alg: Algorithm, key: CryptoKey, data: Buffer, callback: (err: Error, enc: Buffer) => void): void;
    decrypt(session: Session, alg: Algorithm, key: CryptoKey, data: Buffer, callback: (err: Error, dec: Buffer) => void): void;
    wrapKey(session: Session, format: string, key: CryptoKey, wrappingKey: CryptoKey, alg: Algorithm, callback: (err: Error, wkey: Buffer) => void): void;
    unwrapKey(session: Session, format: string, wrappedKey: Buffer, unwrappingKey: CryptoKey, unwrapAlgorithm: Algorithm, unwrappedAlgorithm: Algorithm, extractable: boolean, keyUsages: string[], callback: (err: Error, key: CryptoKey) => void): void;
    deriveKey(session: Session, algorithm: Algorithm, baseKey: CryptoKey, derivedKeyType: Algorithm, extractable: boolean, keyUsages: string[], callback: (err: Error, key: CryptoKey) => void): void;
    exportKey(session: Session, format: string, key: CryptoKey, callback: (err: Error, data: Buffer | IJwk) => void): void;
    importKey(
        session: Session,
        format: string,
        keyData: IJwk | Buffer,
        algorithm: Algorithm,
        extractable: boolean,
        keyUsages: string[],
        callback: (err: Error, key: CryptoKey) => void): void;
}

export abstract class AlgorithmBase {
    static ALGORITHM_NAME: string = "";

    static onCheck(method: string, paramName: string, paramValue: any): void { }

    static generateKey(session: Session, alg: Algorithm, extractable: boolean, keyUsages: string[], callback: (err: Error, key: CryptoKey | CryptoKeyPair) => void): void {
        try {
            throw new Error(error.ERROR_NOT_SUPPORTED_METHOD);
        } catch (e) {
            callback(e, null);
        }
    }

    static sign(session: Session, alg: Algorithm, key: CryptoKey, data: Buffer, callback: (err: Error, signature: Buffer) => void): void {
        try {
            this.checkAlgorithmIdentifier(alg);
            this.onCheck("sign", "alg", alg);
            this.onCheck("sign", "key", key);
            this.onCheck("sign", "data", data);
            let p11Alg = this.wc2pk11(alg, key);

            let signer = session.createSign(p11Alg, (<P11CryptoKey>key).key);
            signer.update(data, (err: Error) => {
                if (err)
                    callback(err, null);
                else
                    signer.final(callback);
            });

        } catch (e) {
            callback(e, null);
        }
    }

    static verify(session: Session, alg: Algorithm, key: CryptoKey, signature: Buffer, data: Buffer, callback: (err: Error, verify: boolean) => void): void {
        try {
            this.checkAlgorithmIdentifier(alg);
            this.onCheck("verify", "alg", alg);
            this.onCheck("verify", "key", key);
            this.onCheck("verify", "data", data);
            this.onCheck("verify", "signature", signature);
            let p11Alg = this.wc2pk11(alg, key);

            let signer = session.createVerify(p11Alg, (<P11CryptoKey>key).key);
            signer.update(data, (err: Error) => {
                if (err)
                    callback(err, null);
                else
                    signer.final(signature, callback);
            });

        } catch (e) {
            callback(e, null);
        }
    }

    static encrypt(session: Session, alg: Algorithm, key: CryptoKey, data: Buffer, callback: (err: Error, enc: Buffer) => void): void {
        try {
            this.checkAlgorithmIdentifier(alg);
            this.onCheck("encrypt", "alg", alg);
            this.onCheck("encrypt", "key", key);
            this.onCheck("encrypt", "data", data);
            let p11Alg = this.wc2pk11(alg, key);

            let cipher = session.createCipher(p11Alg, (<P11CryptoKey>key).key);
            let msg = new Buffer(0);
            // update
            cipher.update(data, (err, enc) => {
                if (err)
                    callback(err, null);
                else {
                    msg = enc;
                    // final
                    cipher.final((err, enc) => {
                        if (err)
                            callback(err, null);
                        else {
                            // return
                            msg = Buffer.concat([msg, enc]);
                            callback(null, msg);
                        }
                    });
                }
            });
        }
        catch (e) {
            callback(e, null);
        }
    }

    static decrypt(session: Session, alg: Algorithm, key: CryptoKey, data: Buffer, callback: (err: Error, dec: Buffer) => void): void {
        try {
            this.checkAlgorithmIdentifier(alg);
            this.onCheck("decrypt", "alg", alg);
            this.onCheck("decrypt", "key", key);
            this.onCheck("decrypt", "data", data);
            let p11Alg = this.wc2pk11(alg, key);

            let cipher = session.createDecipher(p11Alg, (<P11CryptoKey>key).key);
            let msg = new Buffer(0);
            // update
            cipher.update(data, (err, enc) => {
                if (err)
                    callback(err, null);
                else {
                    msg = enc;
                    // final
                    cipher.final((err, enc) => {
                        if (err)
                            callback(err, null);
                        else {
                            // return
                            msg = Buffer.concat([msg, enc]);
                            callback(null, msg);
                        }
                    });
                }
            });
        }
        catch (e) {
            callback(e, null);
        }
    }

    static wrapKey(session: Session, format: string, key: CryptoKey, wrappingKey: CryptoKey, alg: Algorithm, callback: (err: Error, wkey: Buffer) => void): void {
        let that = this;
        try {
            this.exportKey(session, format, key, (err: Error, data: any) => {
                if (err) {
                    callback(err, null);
                }
                else {
                    if (!Buffer.isBuffer(data)) {
                        // JWK to Buffer
                        data = new Buffer(JSON.stringify(data));
                    }
                }
                that.encrypt(session, alg, wrappingKey, data, callback);
            });
        }
        catch (e) {
            callback(e, null);
        }
    }

    static unwrapKey(session: Session, format: string, wrappedKey: Buffer, unwrappingKey: CryptoKey, unwrapAlgorithm: Algorithm, unwrappedAlgorithm: Algorithm, extractable: boolean, keyUsages: string[], callback: (err: Error, key: CryptoKey) => void): void {
        let that = this;
        try {
            this.decrypt(session, unwrapAlgorithm, unwrappingKey, wrappedKey, (err: Error, dec: Buffer) => {
                if (err) {
                    callback(err, null);
                }
                else {
                    try {
                        let ikey: IJwk | Buffer = <Buffer>dec;
                        if (format === "jwk") {
                            ikey = JSON.parse(dec.toString());
                        }
                        that.importKey(session, format, ikey, unwrappedAlgorithm, extractable, keyUsages, callback);
                    }
                    catch (e) {
                        callback(e, null);
                    }
                }
            });
        }
        catch (e) {
            callback(e, null);
        }
    }

    static deriveKey(session: Session, algorithm: Algorithm, baseKey: CryptoKey, derivedKeyType: Algorithm, extractable: boolean, keyUsages: string[], callback: (err: Error, key: CryptoKey) => void): void {
        try {
            throw new Error(error.ERROR_NOT_SUPPORTED_METHOD);
        } catch (e) {
            callback(e, null);
        }
    }

    static exportKey(session: Session, format: string, key: CryptoKey, callback: (err: Error, data: Buffer | IJwk) => void): void {
        try {
            throw new Error(error.ERROR_NOT_SUPPORTED_METHOD);
        } catch (e) {
            callback(e, null);
        }
    }

    static importKey(session: Session, format: string, keyData: IJwk | Buffer, algorithm: Algorithm, extractable: boolean, keyUsages: string[], callback: (err: Error, key: CryptoKey) => void): void {
        try {
            throw new Error(error.ERROR_NOT_SUPPORTED_METHOD);
        } catch (e) {
            callback(e, null);
        }
    }

    protected static checkAlgorithmIdentifier(alg: Algorithm) {
        if (alg.name.toLowerCase() !== this.ALGORITHM_NAME.toLowerCase())
            throw new error.AlgorithmError(`Wrong algorithm name. Must be '${this.ALGORITHM_NAME}''`);
        alg.name = this.ALGORITHM_NAME;
    }

    protected static checkAlgorithmHashedParams(alg: IAlgorithmHashed) {
        if (!alg.hash)
            throw new error.AlgorithmError(`Missing required property hash`);
        if (typeof alg.hash !== "object")
            throw new error.AlgorithmError(`Algorithm must be an Object`);
        if (!(alg.hash.name && typeof (alg.hash.name) === "string"))
            throw new error.AlgorithmError(`Missing required property name`);
    }

    protected static checkKey(key: CryptoKey, type: string) {
        if (!key)
            throw new error.CryptoKeyError(`Key can not be null`);
        if (!(key instanceof P11CryptoKey))
            throw new error.CryptoKeyError(`CryptoKey os not instance of P11CryptoKey`);
        if (key.type !== type)
            throw new error.CryptoKeyError(`Wrong key type in use. Must be '${type}'`);
    }

    protected static checkPrivateKey(key: CryptoKey) {
        this.checkKey(key, KT_PRIVATE);
    }

    protected static checkPublicKey(key: CryptoKey) {
        this.checkKey(key, KT_PUBLIC);
    }

    protected static checkSecretKey(key: CryptoKey) {
        this.checkKey(key, KT_SECRET);
    }

    protected static wc2pk11(alg: Algorithm, key: CryptoKey): IAlgorithm {
        throw new Error("Not implemented");
    }
} 