import protobuf from "https://esm.sh/protobufjs@7.2.5";
import { userSettingsProtoSchema } from './user_settings.proto.js';

let root = null;

function initDecoder() {
    if (root) return root;

    try {
        // 1. Create root and programmatically inject google.protobuf wrapper types
        root = new protobuf.Root();
        const googleProtobuf = root.define("google.protobuf");

        googleProtobuf.add(new protobuf.Type("StringValue").add(new protobuf.Field("value", 1, "string")));
        googleProtobuf.add(new protobuf.Type("BoolValue").add(new protobuf.Field("value", 1, "bool")));
        googleProtobuf.add(new protobuf.Type("UInt32Value").add(new protobuf.Field("value", 1, "uint32")));
        googleProtobuf.add(new protobuf.Type("UInt64Value").add(new protobuf.Field("value", 1, "uint64")));
        googleProtobuf.add(new protobuf.Type("Int32Value").add(new protobuf.Field("value", 1, "int32")));
        googleProtobuf.add(new protobuf.Type("Int64Value").add(new protobuf.Field("value", 1, "int64")));
        googleProtobuf.add(new protobuf.Type("FloatValue").add(new protobuf.Field("value", 1, "float")));

        const timestampType = new protobuf.Type("Timestamp")
            .add(new protobuf.Field("seconds", 1, "int64"))
            .add(new protobuf.Field("nanos", 2, "int32"));
        googleProtobuf.add(timestampType);

        // 2. Parse Discord schema into the root
        protobuf.parse(userSettingsProtoSchema, root, { keepCase: true });

        return root;
    } catch (error) {
        console.error("Failed to parse user settings schema:", error);
        throw error;
    }
}

function base64ToUint8Array(base64) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

export function decodeUserSettingsProto(protoBase64String) {
    if (!protoBase64String) return null;

    try {
        const currentRoot = initDecoder();
        const bytes = base64ToUint8Array(protoBase64String);

        const PreloadedSettings = currentRoot.lookupType("discord_protos.discord_users.v1.PreloadedUserSettings");
        const message = PreloadedSettings.decode(bytes);

        return PreloadedSettings.toObject(message, {
            longs: String,
            enums: String,
            bytes: String,
            defaults: true
        });
    } catch (error) {
        console.error("Failed to decode userSettingsProto:", error);
        return null;
    }
}