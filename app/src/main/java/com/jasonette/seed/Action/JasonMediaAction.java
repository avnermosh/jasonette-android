package com.jasonette.seed.Action;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.os.Parcelable;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.commonsware.cwac.cam2.AbstractCameraActivity;
import com.commonsware.cwac.cam2.CameraActivity;
import com.commonsware.cwac.cam2.VideoRecorderActivity;
import com.commonsware.cwac.cam2.ZoomStyle;
import com.jasonette.seed.Core.JasonViewActivity;
import com.jasonette.seed.Helper.JasonHelper;
import com.jasonette.seed.Launcher.Launcher;
import com.jasonette.seed.Service.agent.JasonAgentService;

import org.json.JSONObject;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.Date;

public class JasonMediaAction {

    // https://developpaper.com/android-webview-supports-input-file-to-enable-camera-photo-selection/
    public static Uri imageUri;

    /**********************************
     *
     * Play
     *
     **********************************/

    public void play(final JSONObject action, JSONObject data, final JSONObject event, final Context context) {
        try {
            if(action.has("options")){
                Intent intent = new Intent(Intent.ACTION_VIEW);
                if(action.getJSONObject("options").has("url")){
                    intent.setDataAndType(Uri.parse(action.getJSONObject("options").getString("url")), "video/mp4");
                }
                if(action.getJSONObject("options").has("muted")){
                    AudioManager am = (AudioManager)context.getSystemService(Context.AUDIO_SERVICE);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M){
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
            if(action.getJSONObject("options").has("muted")){
                AudioManager am = (AudioManager)context.getSystemService(Context.AUDIO_SERVICE);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M){
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
     *Call camera
     */
    public static Intent takePhoto1() {
        //Adjust the camera in a way that specifies the storage location for taking pictures
        String filePath = Environment.getExternalStorageDirectory() + File.separator
                + Environment.DIRECTORY_PICTURES + File.separator;
        // String fileName = "IMG_" + DateFormat.format("yyyyMMdd_hhmmss", Calendar.getInstance(Locale.CHINA)) + ".jpg";
        String fileName = "tmp1.jpg";
        imageUri = Uri.fromFile(new File(filePath + fileName));

        Intent captureIntent = new Intent(android.provider.MediaStore.ACTION_IMAGE_CAPTURE);
        captureIntent.putExtra(MediaStore.EXTRA_OUTPUT, imageUri);

        Intent galleryIntent = new Intent(Intent.ACTION_PICK, android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI);

        Intent chooserIntent = Intent.createChooser(galleryIntent, "Image Chooser");
        chooserIntent.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Parcelable[]{captureIntent});

        // Intent chooserIntent = galleryIntent;

//        Intent chooserIntent = Intent.createChooser(captureIntent, "Image Chooser");

        return chooserIntent;

    }

  
/*
    public static void takePhoto2(final JSONObject action, JSONObject data, final JSONObject event, final Context context) {
      Intent chooserIntent = takePhoto1();

      JSONObject callback = new JSONObject();
      callback.put("class", "JasonMediaAction");
      callback.put("method", "process");

      JasonHelper.dispatchIntent(action, data, event, context, chooserIntent, callback);
    }
*/


    private static File createImageFile() throws IOException {
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss").format(new Date());
        String imageFileName = "1mind_" + timeStamp + ".jpg";
        File photo = new File(Environment.getExternalStorageDirectory(),  imageFileName);
        return photo;
    }

    // public File mTempImage;

    public static Intent makePhotoIntent(String title){

        //Build galleryIntent
        Intent galleryIntent = new Intent(Intent.ACTION_PICK, android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI);
        galleryIntent.setType("image/*");

        //Create chooser
        Intent chooser = Intent.createChooser(galleryIntent,title);

        Intent  cameraIntent = new Intent(android.provider.MediaStore.ACTION_IMAGE_CAPTURE);
        File mTempImage = null;
        try {
            mTempImage = createImageFile();
        } catch (IOException e) {
            e.printStackTrace();
        }

        if (mTempImage != null){
            cameraIntent.putExtra(android.provider.MediaStore.EXTRA_OUTPUT, Uri.fromFile(mTempImage));
            Intent[] extraIntents = {cameraIntent};
            chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, extraIntents);
        }

        return chooser;
    }


    public void pickerAndCamera(final JSONObject action, JSONObject data, final JSONObject event, final Context context) {

        // Image picker intent
        try {
            String type = "image";
            if(action.has("options")){
                if(action.getJSONObject("options").has("type")){
                    type = action.getJSONObject("options").getString("type");
                }
            }

            Intent intent;
            if(type.equalsIgnoreCase("video")){
                // video
                intent = new Intent(Intent.ACTION_PICK, MediaStore.Video.Media.EXTERNAL_CONTENT_URI);
            } else {
                // image
                intent = new Intent(Intent.ACTION_PICK, android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI);
            }

            intent = makePhotoIntent("pickerAndCamera");

            // dispatchIntent method
            // 1. triggers an external Intent
            // 2. attaches a callback with all the payload so that we can pick it up where we left off when the intent returns

            // the callback needs to specify the class name and the method name we wish to trigger after the intent returns
            JSONObject callback = new JSONObject();
            callback.put("class", "JasonMediaAction");
            callback.put("method", "process");

            JasonHelper.dispatchIntent(action, data, event, context, intent, callback);
        } catch (SecurityException e){
            JasonHelper.permission_exception("$media.picker", context);
        } catch (Exception e) {
            Log.d("Warning", e.getStackTrace()[0].getMethodName() + " : " + e.toString());
        }
    }

    public void picker(final JSONObject action, JSONObject data, final JSONObject event, final Context context) {

        // Image picker intent
        try {
            String type = "image";
            if(action.has("options")){
                if(action.getJSONObject("options").has("type")){
                    type = action.getJSONObject("options").getString("type");
                }
            }

            Intent intent;
            if(type.equalsIgnoreCase("video")){
                // video
                intent = new Intent(Intent.ACTION_PICK, MediaStore.Video.Media.EXTERNAL_CONTENT_URI);
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
        } catch (SecurityException e){
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

                    if(action.has("options")) {
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
                    }  catch (Exception e) {
                        Log.d("Warning", e.getStackTrace()[0].getMethodName() + " : " + e.toString());
                    }
                }
            }, 100); // Millisecond 1000 = 1 sec

        } catch (SecurityException e){
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

            if(action.has("options")) {
                JSONObject options = action.getJSONObject("options");

                // type
                if (options.has("type")) {
                    type = options.getString("type");
                }

                // quality
                if(type.equalsIgnoreCase("video")) {
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
            if(type.equalsIgnoreCase("video")) {
                // video
                VideoRecorderActivity.IntentBuilder builder =new VideoRecorderActivity.IntentBuilder(context)
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

                if(!edit){
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

        } catch (SecurityException e){
            JasonHelper.permission_exception("$media.camera", context);
        } catch (Exception e) {
            Log.d("Warning", e.getStackTrace()[0].getMethodName() + " : " + e.toString());
        }
    }

    // util
    public void process(Intent intent, final JSONObject options) {
        try {
            JSONObject action = options.getJSONObject("action");
            JSONObject data = options.getJSONObject("data");
            JSONObject event = options.getJSONObject("event");
            Context context = (Context)options.get("context");

            Uri uri = intent.getData();

            // handling image
            String type = "image";
            if(action.has("options")) {
                if (action.getJSONObject("options").has("type")) {
                    type = action.getJSONObject("options").getString("type");
                }
            }
            if(type.equalsIgnoreCase("video")){
                // video
                try {
                    JSONObject ret = new JSONObject();
                    ret.put("file_url", uri.toString());
                    ret.put("content_type", "video/mp4");
                    JasonHelper.next("success", action, ret, event, context);
                } catch (Exception e) {
                    Log.d("Warning", e.getStackTrace()[0].getMethodName() + " : " + e.toString());
                }
            } else {
                // image
                InputStream stream =  context.getContentResolver().openInputStream(uri);
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
            }

        } catch (Exception e) {
            Log.d("Warning", e.getStackTrace()[0].getMethodName() + " : " + e.toString());
        }
    }
    private File createFile(String type, Context context) throws IOException {
        // Create an image file name
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss").format(new Date());
        String fileName = "" + timeStamp + "_";
        File storageDir = context.getExternalFilesDir(Environment.DIRECTORY_PICTURES);

        File f;
        if(type.equalsIgnoreCase("image")) {
            f = File.createTempFile( fileName, ".jpg", storageDir );
        } else if(type.equalsIgnoreCase("video")){
            f = File.createTempFile( fileName, ".mp4", storageDir );
        } else {
            f = File.createTempFile( fileName, ".txt", storageDir );
        }
        return f;
    }

}
