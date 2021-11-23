package com.jasonette.seed.Action;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.os.Parcelable;
import android.provider.DocumentsContract;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.util.Base64;
import android.util.Log;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import com.commonsware.cwac.cam2.AbstractCameraActivity;
import com.commonsware.cwac.cam2.CameraActivity;
import com.commonsware.cwac.cam2.VideoRecorderActivity;
import com.commonsware.cwac.cam2.ZoomStyle;
import com.jasonette.seed.Helper.JasonHelper;
import com.jasonette.seed.Helper.ZipUtil;
import org.json.JSONObject;
import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import com.google.gson.Gson;

public class JasonMediaAction {

    // https://developpaper.com/android-webview-supports-input-file-to-enable-camera-photo-selection/
    public static Uri imageUri;
    public static String dirPath;

    /**********************************
     *
     * Play
     *
     **********************************/

    public void play(final JSONObject action, JSONObject data, final JSONObject event, final Context context) {
        try {
            if (action.has("options")) {
                Intent intent = new Intent(Intent.ACTION_VIEW);
                if (action.getJSONObject("options").has("url")) {
                    intent.setDataAndType(Uri.parse(action.getJSONObject("options").getString("url")), "video/mp4");
                }
                if (action.getJSONObject("options").has("muted")) {
                    AudioManager am = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        am.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_MUTE, 0);
                    } else {
                        am.setStreamMute(AudioManager.STREAM_MUSIC, true);
                    }
                }
                JSONObject callback = new JSONObject();
                callback.put("class", "JasonMediaAction");
                callback.put("method", "finishplay");
                JasonHelper.dispatchIntent(action, data, event, context, intent, callback);
            }
        } catch (Exception e) {
            Log.d("Warning", e.getStackTrace()[0].getMethodName() + " : " + e.toString());
        }
    }

    // Util for play
    public void finishplay(Intent intent, final JSONObject options) {
        try {
            JSONObject action = options.getJSONObject("action");
            JSONObject event = options.getJSONObject("event");
            Context context = (Context) options.get("context");

            // revert mute
            if (action.getJSONObject("options").has("muted")) {
                AudioManager am = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    am.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_UNMUTE, 0);
                } else {
                    am.setStreamMute(AudioManager.STREAM_MUSIC, false);
                }
            }

            JasonHelper.next("success", action, new JSONObject(), event, context);
        } catch (Exception e) {
            Log.d("Warning", e.getStackTrace()[0].getMethodName() + " : " + e.toString());
        }
    }


    /**********************************
     *
     * Picker + Camera
     *
     **********************************/

    // https://developpaper.com/android-webview-supports-input-file-to-enable-camera-photo-selection/
    private int REQUEST_CODE = 1234;

    /**
     * Call camera
     */
    public Intent takePhoto1(Context context) {
        //Adjust the camera in a way that specifies the storage location for taking pictures

        Intent chooserIntent = null;
        try {
            Intent captureIntent = new Intent(android.provider.MediaStore.ACTION_IMAGE_CAPTURE);
            File f1 = createFile2("image", context);

            imageUri = FileProvider.getUriForFile(
                    context,
                    //(use your app signature + ".provider" )
                    // "com.example.android.fileprovider",
                    "com.construction_overlay_internal.android.fileprovider",
                    f1);

            captureIntent.putExtra(MediaStore.EXTRA_OUTPUT, imageUri);
            Intent galleryIntent = new Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI);
            chooserIntent = Intent.createChooser(galleryIntent, "Image Chooser");
            chooserIntent.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Parcelable[]{captureIntent});
        } catch (SecurityException e) {
            JasonHelper.permission_exception("$media.camera", context);
        } catch (Exception e) {
            Log.d("Warning", e.getStackTrace()[0].getMethodName() + " : " + e.toString());
        }

        return chooserIntent;
    }

    public Intent takeFile1(String type, Context context) {
        //Adjust the camera in a way that specifies the storage location for taking pictures

        Intent chooserIntent = null;
        try {
            File f1 = createFile3(type, context);
            Uri uri1 = FileProvider.getUriForFile(
                    context,
                    "com.construction_overlay_internal.android.fileprovider",
                    f1);

            Intent fileIntent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            fileIntent.addCategory(Intent.CATEGORY_OPENABLE);
            fileIntent.setType("application/zip");

            // Optionally, specify a URI for the file that should appear in the
            // system file picker when it loads.
            imageUri = uri1;
            Uri pickerInitialUri = uri1;
            fileIntent.putExtra(DocumentsContract.EXTRA_INITIAL_URI, pickerInitialUri);

            chooserIntent = Intent.createChooser(fileIntent, "Image Chooser");
        } catch (SecurityException e) {
            JasonHelper.permission_exception("$media.camera", context);
        } catch (Exception e) {
            Log.d("Warning", e.getStackTrace()[0].getMethodName() + " : " + e.toString());
        }

        return chooserIntent;
    }

    private static File createImageFile() throws IOException {
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss").format(new Date());
        String imageFileName = "1mind_" + timeStamp + ".jpg";
        File photo = new File(Environment.getExternalStorageDirectory(), imageFileName);
        return photo;
    }


    public static byte[] loadFileSlice(int sliceBeg, int sliceEnd) throws Exception {
        Log.d("Verbose", "BEG loadFileSlice");
        Log.d("Verbose", "dirPath: " + dirPath);

        // sanity check - check that the file exists
        File internalFile = new File(dirPath);
        if (!internalFile.exists()) {
            StringBuilder error = new StringBuilder();
            error.append("File does not exist: ");
            error.append(dirPath);
            throw new Exception("error occurred: " + error.toString());
        }
        Log.d("Verbose", "foo4");

        String zipFileName = dirPath;
        int numBytesToRead = (int)(sliceEnd - sliceBeg + 1);
        byte[] byteArray = new byte[numBytesToRead];
        byteArray = ZipUtil.extractZipEntryData_toArrayBuffer(zipFileName, sliceBeg, numBytesToRead, byteArray);
        return byteArray;
    }


    public void pickZipFile(final JSONObject action, JSONObject data, final JSONObject event, final Context context) {

        // Image picker intent
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED
                        || ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                    ActivityCompat.requestPermissions((Activity) context, new String[]{Manifest.permission.CAMERA}, 51);
                }
                ActivityCompat.requestPermissions((Activity) context, new String[]{Manifest.permission.READ_EXTERNAL_STORAGE}, 101);
            }

            String type = "zipFile";
            if (action.has("options")) {
                if (action.getJSONObject("options").has("type")) {
                    type = action.getJSONObject("options").getString("type");
                }
            }

            Intent intent;
            intent = takeFile1(type, context);

            // the callback needs to specify the class name and the method name we wish to trigger after the intent returns
            JSONObject callback = new JSONObject();
            callback.put("class", "JasonMediaAction");
            callback.put("method", "process");

            JasonHelper.dispatchIntent(action, data, event, context, intent, callback);
        } catch (SecurityException e) {
            JasonHelper.permission_exception("$media.picker", context);
        } catch (Exception e) {
            Log.d("Warning", e.getStackTrace()[0].getMethodName() + " : " + e.toString());
        }
    }


    public void pickerAndCamera(final JSONObject action, JSONObject data, final JSONObject event, final Context context) {

        // Image picker intent
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED
                        || ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                    ActivityCompat.requestPermissions((Activity) context, new String[]{Manifest.permission.CAMERA}, 51);
                }
                ActivityCompat.requestPermissions((Activity) context, new String[]{Manifest.permission.READ_EXTERNAL_STORAGE}, 101);
            }

            String type = "image";
            if (action.has("options")) {
                if (action.getJSONObject("options").has("type")) {
                    type = action.getJSONObject("options").getString("type");
                }
            }

            Intent intent;
            // intent = takePhoto1(context);
            intent = takeFile1(type, context);

            // dispatchIntent method
            // 1. triggers an external Intent
            // 2. attaches a callback with all the payload so that we can pick it up where we left off when the intent returns

            // the callback needs to specify the class name and the method name we wish to trigger after the intent returns
            JSONObject callback = new JSONObject();
            callback.put("class", "JasonMediaAction");
            callback.put("method", "process");

            JasonHelper.dispatchIntent(action, data, event, context, intent, callback);
        } catch (SecurityException e) {
            JasonHelper.permission_exception("$media.picker", context);
        } catch (Exception e) {
            Log.d("Warning", e.getStackTrace()[0].getMethodName() + " : " + e.toString());
        }
    }

    public void picker(final JSONObject action, JSONObject data, final JSONObject event, final Context context) {

        // Image picker intent
        try {
            String type = "image";
            if (action.has("options")) {
                if (action.getJSONObject("options").has("type")) {
                    type = action.getJSONObject("options").getString("type");
                }
            }

            Intent intent;
            if (type.equalsIgnoreCase("video")) {
                // video
                intent = new Intent(Intent.ACTION_PICK, MediaStore.Video.Media.EXTERNAL_CONTENT_URI);
            } else if (type.equalsIgnoreCase("image")) {
                // image
                intent = new Intent(Intent.ACTION_PICK, android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI);
            } else {
                // image
                intent = new Intent(Intent.ACTION_PICK, android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI);
            }

            // dispatchIntent method
            // 1. triggers an external Intent
            // 2. attaches a callback with all the payload so that we can pick it up where we left off when the intent returns

            // the callback needs to specify the class name and the method name we wish to trigger after the intent returns
            JSONObject callback = new JSONObject();
            callback.put("class", "JasonMediaAction");
            callback.put("method", "process");

            JasonHelper.dispatchIntent(action, data, event, context, intent, callback);
        } catch (SecurityException e) {
            JasonHelper.permission_exception("$media.picker", context);
        } catch (Exception e) {
            Log.d("Warning", e.getStackTrace()[0].getMethodName() + " : " + e.toString());
        }

    }

    // Just ask the permissions
    // $media.permissions
    public void permissions(final JSONObject action, JSONObject data, final JSONObject event, final Context context) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED
                        || ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {

                    if (action.has("options")) {
                        JSONObject options = action.getJSONObject("options");
                        String type = "all";
                        if (options.has("type")) {

                            type = options.getString("type");

                            if (type.equalsIgnoreCase("camera")) {
                                ActivityCompat.requestPermissions((Activity) context, new String[]{Manifest.permission.CAMERA}, 100);
                            }

                            if (type.equalsIgnoreCase("files")) {
                                ActivityCompat.requestPermissions((Activity) context, new String[]{Manifest.permission.READ_EXTERNAL_STORAGE}, 101);
                            }

                            if (type.equalsIgnoreCase("all")) {
                                ActivityCompat.requestPermissions((Activity) context, new String[]{Manifest.permission.CAMERA, Manifest.permission.READ_EXTERNAL_STORAGE}, 151);
                            }

                        } else {
                            ActivityCompat.requestPermissions((Activity) context, new String[]{Manifest.permission.CAMERA, Manifest.permission.READ_EXTERNAL_STORAGE}, 251);
                        }
                    } else {
                        ActivityCompat.requestPermissions((Activity) context, new String[]{Manifest.permission.CAMERA, Manifest.permission.READ_EXTERNAL_STORAGE}, 51);
                    }
                }
            }

            // We need at least 100 ms to call the success with the result
            // If not then it will be omitted since it will too fast 
            // for the system to process.
            new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
                @Override
                public void run() {
                    try {
                        JSONObject ret = new JSONObject();
                        ret.put("files", ContextCompat.checkSelfPermission(context, Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED);
                        ret.put("camera", ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED);
                        JasonHelper.next("success", action, ret, event, context);
                    } catch (Exception e) {
                        Log.d("Warning", e.getStackTrace()[0].getMethodName() + " : " + e.toString());
                    }
                }
            }, 100); // Millisecond 1000 = 1 sec

        } catch (SecurityException e) {
            JasonHelper.permission_exception("$media.permissions", context);
        } catch (Exception e) {
            Log.d("Warning", e.getStackTrace()[0].getMethodName() + " : " + e.toString());
        }
    }

    public void camera(final JSONObject action, JSONObject data, final JSONObject event, final Context context) {

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED
                        || ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                    ActivityCompat.requestPermissions((Activity) context, new String[]{Manifest.permission.CAMERA}, 51);
                }
            }

            AbstractCameraActivity.Quality q = AbstractCameraActivity.Quality.LOW;
            String type = "photo";
            Boolean edit = false;

            if (action.has("options")) {
                JSONObject options = action.getJSONObject("options");

                // type
                if (options.has("type")) {
                    type = options.getString("type");
                }

                // quality
                if (type.equalsIgnoreCase("video")) {
                    // video
                    // high by default
                    q = AbstractCameraActivity.Quality.HIGH;
                } else {
                    // photo
                    // high by default
                    q = AbstractCameraActivity.Quality.HIGH;
                }
                if (options.has("quality")) {
                    String quality = options.getString("quality");
                    if (quality.equalsIgnoreCase("low")) {
                        q = AbstractCameraActivity.Quality.LOW;
                    } else if (quality.equalsIgnoreCase("medium")) {
                        q = AbstractCameraActivity.Quality.HIGH;
                    }
                }

                // edit
                if (options.has("edit")) {
                    edit = true;
                }
            }

            Intent intent;
            if (type.equalsIgnoreCase("video")) {
                // video
                VideoRecorderActivity.IntentBuilder builder = new VideoRecorderActivity.IntentBuilder(context)
                        .to(createFile("video", context))
                        .zoomStyle(ZoomStyle.SEEKBAR)
                        .updateMediaStore()
                        .quality(q);

                intent = builder.build();

            } else {
                // photo
                CameraActivity.IntentBuilder builder = new CameraActivity.IntentBuilder(context)
                        .to(createFile("image", context))
                        .zoomStyle(ZoomStyle.SEEKBAR)
                        .updateMediaStore()
                        .quality(q);

                if (!edit) {
                    builder.skipConfirm();
                }

                intent = builder.build();

            }

            // dispatchIntent method
            // 1. triggers an external Intent
            // 2. attaches a callback with all the payload so that we can pick it up where we left off when the intent returns

            // the callback needs to specify the class name and the method name we wish to trigger after the intent returns
            JSONObject callback = new JSONObject();
            callback.put("class", "JasonMediaAction");
            callback.put("method", "process");
            JasonHelper.dispatchIntent(action, data, event, context, intent, callback);

        } catch (SecurityException e) {
            JasonHelper.permission_exception("$media.camera", context);
        } catch (Exception e) {
            Log.d("Warning", e.getStackTrace()[0].getMethodName() + " : " + e.toString());
        }
    }

    public static void writeBytesToFile(InputStream is, File file) throws IOException {
        FileOutputStream fos = null;
        int nbread_total = 0;
        try {
            byte[] data = new byte[2048];
            int nbread = 0;
            fos = new FileOutputStream(file);
            while ((nbread = is.read(data)) > -1) {
                nbread_total += nbread;
                // Log.d("Verbose", "nbread: " + nbread);
                // Log.d("Verbose", "nbread_total: " + nbread_total);

                fos.write(data, 0, nbread);
            }
        } catch (Exception ex) {
            // logger.error("Exception", ex);
            Log.d("Warning", "Exception: " + ex);

        } finally {
            if (fos != null) {
                Log.d("Verbose", "nbread_total11: " + nbread_total);
                fos.close();
            }
        }
    }

    // https://stackoverflow.com/questions/5568874/how-to-extract-the-file-name-from-uri-returned-from-intent-action-get-content
    public String getFileName(Context context, Uri uri) {
        String result = null;
        if (uri.getScheme().equals("content")) {
            Cursor cursor = context.getContentResolver().query(uri, null, null, null, null);
            try {
                if (cursor != null && cursor.moveToFirst()) {
                    result = cursor.getString(cursor.getColumnIndexOrThrow(OpenableColumns.DISPLAY_NAME));
                }
            } finally {
                cursor.close();
            }
        }
        if (result == null) {
            result = uri.getPath();
            int cut = result.lastIndexOf('/');
            if (cut != -1) {
                result = result.substring(cut + 1);
            }
        }
        return result;
    }

    // util
    public void process(Intent intent, final JSONObject options) {
        try {
            JSONObject action = options.getJSONObject("action");
            JSONObject data = options.getJSONObject("data");
            JSONObject event = options.getJSONObject("event");
            Context context = (Context) options.get("context");

            // for file picker
            Uri uri = intent.getData();
            if (uri == null) {
                // for camera
                uri = imageUri;
            }

            // handling image
            String type = "image";
            if (action.has("options")) {
                if (action.getJSONObject("options").has("type")) {
                    type = action.getJSONObject("options").getString("type");
                }
            }
            if (type.equalsIgnoreCase("video")) {
                // video
                try {
                    JSONObject ret = new JSONObject();
                    ret.put("file_url", uri.toString());
                    ret.put("content_type", "video/mp4");
                    JasonHelper.next("success", action, ret, event, context);
                } catch (Exception e) {
                    Log.d("Warning", e.getStackTrace()[0].getMethodName() + " : " + e.toString());
                }
            } else if (type.equalsIgnoreCase("image")) {
                // image
                InputStream stream = context.getContentResolver().openInputStream(uri);
                byte[] byteArray = JasonHelper.readBytes(stream);
                String encoded = Base64.encodeToString(byteArray, Base64.NO_WRAP);

                StringBuilder stringBuilder = new StringBuilder();
                stringBuilder.append("data:image/jpeg;base64,");
                stringBuilder.append(encoded);
                String data_uri = stringBuilder.toString();

                try {
                    JSONObject ret = new JSONObject();
                    ret.put("data", encoded);
                    ret.put("data_uri", data_uri);
                    ret.put("content_type", "image/jpeg");
                    JasonHelper.next("success", action, ret, event, context);
                } catch (Exception e) {
                    Log.d("Warning", e.getStackTrace()[0].getMethodName() + " : " + e.toString());
                }
            } else if (type.equalsIgnoreCase("zipFile")) {
                // zip file

                // example uri
                // content://com.android.providers.downloads.documents/document/msf%3A13255
                Log.d("Verbose", "uri0: " + uri);

                String fileName = getFileName(context, uri);
                Log.d("Verbose", "fileName: " + fileName);
                dirPath = "/data/user/0/com.construction_overlay_internal/" + fileName;
                File internalFile = new File(dirPath);
                if (internalFile.exists()) {
                    Log.d("Verbose", "fileName: " + fileName + ", exists.");
                } else {
                    Log.d("Verbose", "fileName: " + fileName + ", does NOT exist.");
                    // save the file to internal storage
                    try (InputStream ins = context.getContentResolver().openInputStream(uri)) {
                        File dest = new File(dirPath);
                        try (OutputStream os = new FileOutputStream(dest)) {
                            byte[] buffer = new byte[4096];
                            int length;
                            while ((length = ins.read(buffer)) > 0) {
                                os.write(buffer, 0, length);
                            }
                            os.flush();
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }

                Map<String, ZipUtil.Zipinfo_header> zipFileInfoFiles = new HashMap<String, ZipUtil.Zipinfo_header>();
                ZipUtil.getZip_FileHeaders(dirPath, zipFileInfoFiles);

                // convert hashmap to json string
                Gson gson = new Gson();
                String zipFileInfoFiles_asJsonStr = gson.toJson(zipFileInfoFiles);
                Log.d("Verbose", "zipFileInfoFiles_asJsonStr: " + zipFileInfoFiles_asJsonStr);

                // File file = new File(dirPath);
                try {
                    JSONObject ret = new JSONObject();
                    ret.put("zipFileInfoFiles_asJsonStr", zipFileInfoFiles_asJsonStr);
                    ret.put("dirPath", dirPath);
                    ret.put("content_type", "application/zip");
                    JasonHelper.next("success", action, ret, event, context);
                } catch (Exception e) {
                    Log.d("Warning", e.getStackTrace()[0].getMethodName() + " : " + e.toString());
                }
            } else {
                // file
                Log.d("Warning", "type is not supported: " + type);
            }

        } catch (Exception e) {
            Log.d("Warning", e.getStackTrace()[0].getMethodName() + " : " + e.toString());
        }
    }

    private boolean unpackZip(String path, String zipname) {
        InputStream is;
        ZipInputStream zis;
        try {
            String filename;
            is = new FileInputStream(path + zipname);
            zis = new ZipInputStream(new BufferedInputStream(is));
            ZipEntry ze;
            byte[] buffer = new byte[1024];
            int count;

            while ((ze = zis.getNextEntry()) != null) {
                filename = ze.getName();

                // Need to create directories if not exists, or
                // it will generate an Exception...
                if (ze.isDirectory()) {
                    File fmd = new File(path + filename);
                    fmd.mkdirs();
                    continue;
                }

                FileOutputStream fout = new FileOutputStream(path + filename);

                while ((count = zis.read(buffer)) != -1) {
                    fout.write(buffer, 0, count);
                }

                fout.close();
                zis.closeEntry();
            }

            zis.close();
        } catch (IOException e) {
            e.printStackTrace();
            return false;
        }

        return true;
    }

    private File createFile(String type, Context context) throws IOException {
        // Create an image file name
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss").format(new Date());
        String fileName = "" + timeStamp + "_";
        File storageDir = context.getExternalFilesDir(Environment.DIRECTORY_PICTURES);

        String fileName1;
        File f;
        if (type.equalsIgnoreCase("image")) {
            fileName1 = fileName + ".jpg";
            f = File.createTempFile(fileName, ".jpg", storageDir);
        } else if (type.equalsIgnoreCase("video")) {
            fileName1 = fileName + ".mp4";
            f = File.createTempFile(fileName, ".mp4", storageDir);
        } else if (type.equalsIgnoreCase("zipFile")) {
            fileName1 = fileName + ".zip";
            f = File.createTempFile(fileName, ".zip", storageDir);
        } else {
            fileName1 = fileName + ".txt";
            f = File.createTempFile(fileName, ".txt", storageDir);
        }

        return f;
    }

    private File createFile2(String type, Context context) throws IOException {
        // Create an image file name
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss").format(new Date());
        String fileName = "" + timeStamp + "_";
        File storageDir = context.getExternalFilesDir(Environment.DIRECTORY_PICTURES);

        // https://stackoverflow.com/questions/35272403/camera-result-always-returns-result-canceled
        File f2 = new File(context.getExternalFilesDir(Environment.DIRECTORY_PICTURES), "camera.jpg");
        return f2;
    }


    private File createFile3(String type, Context context) throws IOException {
        // Create a file name
        // String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss").format(new Date());
        // String fileName = "" + timeStamp + "_";
        String fileName = "file2";
        File storageDir = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);

        String fileName1;
        File f;
        if (type.equalsIgnoreCase("zipFile")) {
            fileName1 = fileName + ".zip";
            f = File.createTempFile(fileName, ".zip", storageDir);
        } else {
            fileName1 = fileName + ".txt";
            f = File.createTempFile(fileName, ".txt", storageDir);
        }

        Log.d("Verbose", "fileName: " + fileName);
        Log.d("Verbose", "fileName1: " + fileName1);

        return f;
    }


}

