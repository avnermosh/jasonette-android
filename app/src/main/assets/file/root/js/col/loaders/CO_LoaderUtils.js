import { COL } from '../COL.js';
import { BlobInfo } from "../core/BlobInfo.js";
import { ImageInfo } from "../core/ImageInfo.js";

COL.loaders.utils = {};

COL.loaders.utils.addMetaDataFileInfoToMetaDataFilesInfo = function(metaDataFilesInfo, metaData, filename) {
    // console.log('BEG addMetaDataFileInfoToMetaDataFilesInfo'); 

    let blob = new Blob([metaData]);
    let blobUrl = URL.createObjectURL(blob);
    let metaDataFileInfo = metaDataFilesInfo.getByKey(filename);
    if(COL.util.isObjectInvalid(metaDataFileInfo))
    {
        // blobInfo does not exist - create it
        let blobInfo = new BlobInfo({filenameFullPath: filename, blobUrl: blobUrl, isDirty: true});
        
        metaDataFileInfo = new ImageInfo({filename: filename, blobInfo: blobInfo});
    }
    else
    {
        if(COL.util.isObjectInvalid(metaDataFileInfo.blobInfo))
        {
            // metaDataFileInfo.blobInfo does not exist - create it
            metaDataFileInfo.blobInfo = new BlobInfo({filenameFullPath: filename, blobUrl: blobUrl, isDirty: true});
        }
        else
        {
            // metaDataFileInfo.blobInfo exists - update the url
            URL.revokeObjectURL(metaDataFileInfo.blobInfo.blobUrl);
            metaDataFileInfo.blobInfo.blobUrl = blobUrl;
        }
    }
    metaDataFilesInfo.set(filename, metaDataFileInfo);
};

COL.loaders.utils.exportLayer_toJSON_str = function (layer) {
    console.log('BEG exportLayer_toJSON_str');

    let layer_asJson = layer.toJSON_forFile();

    let layer_asJson_str = JSON.stringify(layer_asJson);
    return layer_asJson_str;
};

